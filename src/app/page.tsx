import { compile, run } from "@mdx-js/mdx";
import { Suspense } from "react";
import * as runtime from "react/jsx-runtime";
import MDX from "./components/mdx.tsx";
import Button from "./components/button.tsx";

const Remote = async () => {
    const code = String(await compile("# hi", { outputFormat: "function-body" }));
    const { default: Content } = await run(code, runtime as any);

    return (
        <ul>
            <li>
                <MDX>
                    <Content />
                </MDX>
                <Button />
            </li>
        </ul>
    );
};

export default function Page() {
    return (
        <div>
            <h1>Hello, world!</h1>
            <Suspense fallback={<div>Loading...</div>}>
                {/* @ts-expect-error */}
                <Remote />
            </Suspense>
        </div>
    );
}
