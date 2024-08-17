import { client, resolveBuild, resolveSrc, server } from "./lib/build.ts";
import chokidar from "chokidar";
import nodemon, { Nodemon } from "nodemon";
import * as rimraf from "rimraf";

let nodemonInstance: Nodemon | null = null;

const nodemonTrigger = () => {
    if (nodemonInstance) {
        nodemonInstance.restart();
    } else {
        // @ts-expect-error
        nodemonInstance = nodemon({
            script: resolveSrc("server.ts"),
            exec: "tsx --conditions react-server",
            watch: false,
        });

        if (!nodemonInstance) {
            return;
        }

        nodemonInstance.on("quit", () => {
            process.exit();
        });
    }
};

const exec = async () => {
    rimraf.sync(resolveBuild());
    await server();
    const { rebuild } = await client();
    nodemonTrigger();
    chokidar
        .watch("src/**/*", {
            persistent: true,
            ignoreInitial: true,
        })
        .on("all", async () => {
            console.log("Files changed, rebuilding...");
            await server();
            rebuild();
            nodemonTrigger();
        });
};

exec();
