import { dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { parse } from "es-module-lexer";
import { sassPlugin } from "esbuild-sass-plugin";
import browserSync from "@rbnlffl/esbuild-plugin-browser-sync";
import esbuild from "esbuild";

const srcDir = new URL("../../src/", import.meta.url);
const appDir = new URL("../../src/app/", import.meta.url);
const buildDir = new URL("../../build/", import.meta.url);

export const resolveSrc = (path = "") => fileURLToPath(new URL(path, srcDir));
export const resolveApp = (path = "") => fileURLToPath(new URL(path, appDir));
export const resolveBuild = (path = "") => fileURLToPath(new URL(path, buildDir));

let clientEntryPoints = new Set<string>();
let clientComponentMap: {
    [key: string]: {
        id: string;
        name: string;
        chunks: string[];
        async: boolean;
    };
} = {};

export const server = async () => {
    console.log("Building server...");
    clientEntryPoints.clear();
    clientComponentMap = {};
    await esbuild.build({
        bundle: true,
        format: "esm",
        entryPoints: [resolveApp("page.tsx")],
        outdir: resolveBuild("app"),
        packages: "external",
        plugins: [
            sassPlugin(),
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
    console.log("Completed server...");
};

export const client = async () => {
    console.log("Building client...");
    const ctx = await esbuild.context({
        bundle: true,
        format: "esm",
        entryPoints: [resolveSrc("client.tsx"), ...clientEntryPoints],
        outdir: resolveBuild(),
        splitting: true,
        plugins: [
            browserSync({
                port: 4545,
                notify: false,
                ui: false,
                logLevel: "silent",
                logFileChanges: false,
                logSnippet: false,
                logConnections: false,
            }),
            sassPlugin(),
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

    const generate = async () => {
        const { outputFiles } = await ctx.rebuild();
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
    };

    await generate();

    console.log("Completed client...");
    return { rebuild: generate };
};
