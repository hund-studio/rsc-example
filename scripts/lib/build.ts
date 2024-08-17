import esbuild from "esbuild";
import { dirname, relative } from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { parse } from "es-module-lexer";
import { fileURLToPath } from "node:url";
import * as rimraf from "rimraf";

const srcDir = new URL("../../src/", import.meta.url);
const appDir = new URL("../../src/app/", import.meta.url);
const buildDir = new URL("../../build/", import.meta.url);

export const resolveSrc = (path = "") => fileURLToPath(new URL(path, srcDir));
export const resolveApp = (path = "") => fileURLToPath(new URL(path, appDir));
export const resolveBuild = (path = "") => fileURLToPath(new URL(path, buildDir));

export const build = async () => {
    console.log("Building...");
    rimraf.sync(resolveBuild());

    const clientEntryPoints = new Set<string>();
    const clientComponentMap: {
        [key: string]: {
            id: string;
            name: string;
            chunks: string[];
            async: boolean;
        };
    } = {};

    await esbuild.build({
        bundle: true,
        format: "esm",
        entryPoints: [resolveApp("page.tsx")],
        outdir: resolveBuild(),
        packages: "external",
        plugins: [
            {
                name: "resolve-client-imports",
                setup(build) {
                    build.onResolve({ filter: /\.(jsx|tsx)$/ }, async ({ path: relativePath }) => {
                        const path = resolveApp(relativePath);
                        const contents = await readFile(path, "utf8");

                        if (
                            contents.startsWith("'use client'") ||
                            contents.startsWith('"use client"')
                        ) {
                            clientEntryPoints.add(path);

                            return {
                                path: relativePath.replace(/\.(jsx|tsx)$/, ".js"),
                                external: true,
                            };
                        }
                    });
                },
            },
        ],
    });

    const { outputFiles } = await esbuild.build({
        bundle: true,
        format: "esm",
        entryPoints: [resolveApp("client.tsx"), ...clientEntryPoints],
        outdir: resolveBuild(),
        splitting: true,
        plugins: [
            {
                name: "replace-webpack-require",
                setup(build) {
                    build.onLoad({ filter: /\.js$/ }, async ({ path: relativePath }) => {
                        const path = resolveApp(relativePath);
                        const contents = await readFile(path, "utf8");
                        let source = contents;
                        source = source.replace(
                            /__webpack_require__/g,
                            "__custom_webpack_require__"
                        );
                        source = `
const __custom_webpack_require__ = (id) => import(id);
${source}
                        `;

                        return {
                            contents: source,
                            loader: "js",
                        };
                    });
                },
            },
        ],
        write: false,
    });

    await Promise.all(
        outputFiles.map(async (file) => {
            const [, exports] = await parse(file.text);
            let newContents = file.text;

            for (const exp of exports) {
                const key = file.path + "#" + exp.n;

                clientComponentMap[key] = {
                    id: `/build/${relative(resolveBuild(), file.path)}`,
                    name: exp.n,
                    chunks: [],
                    async: true,
                };

                newContents += `
${exp.ln}.$$typeof = Symbol.for('react.client.reference');
${exp.ln}.$$id = ${JSON.stringify(key)};
`;
            }

            const fileDir = dirname(file.path);
            await mkdir(fileDir, { recursive: true });
            await writeFile(file.path, newContents);
        })
    );

    await writeFile(
        resolveBuild("rsc-client-manifest.json"),
        JSON.stringify(clientComponentMap, null, 2)
    );
    console.log("Completed...");
};
