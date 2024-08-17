"use client";

import { MDXProvider } from "@mdx-js/react";
import { FC, PropsWithChildren } from "react";

const components = {};

const MDX: FC<PropsWithChildren> = ({ children }) => {
    return <MDXProvider components={components}>{children}</MDXProvider>;
};

export default MDX;
