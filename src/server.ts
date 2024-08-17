import { createElement } from "react";
import { fileURLToPath } from "node:url";
import { resolveBuild } from "../scripts/lib/build.ts";
import express from "express";
// @ts-expect-error
import * as ReactServerDom from "react-server-dom-webpack/server";
// @ts-expect-error
import register from "react-server-dom-webpack/node-register";

register();

const port = process.env.PORT || 3000;
const app = express();

const publicDir = new URL("../public/", import.meta.url);

const resolvePublic = (path = "") => fileURLToPath(new URL(path, publicDir));

app.use("/build", express.static(resolveBuild()));
app.use(express.static(resolvePublic()));

app.get("/rsc", async (req, res) => {
    const Page = await import(resolveBuild("app/page.js"));
    const Component = createElement(Page.default, { headers: req["headers"] });
    const manifest = await import(resolveBuild("rsc-client-manifest.json"));
    const { pipe } = ReactServerDom.renderToPipeableStream(Component, manifest);
    pipe(res);
});

app.get("/", async (req, res) => {
    return res.sendFile(resolvePublic("index.html"));
});

app.listen(port, async () => {
    console.log("Server is running on http://localhost:" + port);
});
