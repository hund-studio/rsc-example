import { build, resolveSrc } from "./lib/build.ts";
import chokidar from "chokidar";
import nodemon, { Nodemon } from "nodemon";

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

const compile = async () => {
    await build();
    nodemonTrigger();
};

const exec = async () => {
    await compile();
    chokidar
        .watch("src/**/*", {
            persistent: true,
            ignoreInitial: true,
        })
        .on("all", async (file, path) => {
            console.log(path);
            console.log("Files changed, rebuilding...");
            await compile();
        });
};

exec();
