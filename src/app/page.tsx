import { compile, run } from "@mdx-js/mdx";
import { Suspense } from "react";
import * as runtime from "react/jsx-runtime";
import MDX from "./components/mdx.tsx";
import remarkGfm from "remark-gfm";

const Remote = async () => {
    const code = String(
        await compile("# Hey", { outputFormat: "function-body", remarkPlugins: [remarkGfm] })
    );
    const { default: Content } = await run(code, runtime as any);

    return (
        <MDX>
            <Content />
        </MDX>
    );
};

export default function Page({ headers }: { headers: Record<string, string> }) {
    return (
        <main className='dnd-page'>
            <Suspense fallback={<div>Loading...</div>}>
                {/* @ts-expect-error */}
                <Remote />
            </Suspense>
        </main>
    );
}
