import { resolve, extname } from "path";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";

import { downloadBinaryFile, getBinaryPath, isBinaryFile } from "./binary";

const IO_CHANNEL_PREFIX = "_ioc:";

export type NativeWebViewSettings = {
    focus: {},
    close: {},
    eval: { js: string },

    title: { title: string },
    /**
     * Sets the window icon. On Windows and Linux, this is typically the small icon in the top-left
     * corner of the title bar.
     *
     * ## Platform-specific
     * - **iOS / Android / macOS:** Unsupported.
     *
     * On Windows, this sets `ICON_SMALL`. The base size for a window icon is 16x16, but it's
     * recommended to account for screen scaling and pick a multiple of that, i.e. 32x32.
     */
    windowIcon: { path: string },
    resizable: { resizable: boolean },
    innerSize: { width: number, height: number },
    minInnerSize: { width: number, height: number },
    maxInnerSize: { width: number, height: number },
    outerPosition: { top: number, left: number },
    alwaysOnTop: { always: boolean },
    decorations: { decorations: boolean },
    fullscreen: { fullscreen: boolean },
    maximized: { maximized: boolean },
    minimized: { minimized: boolean },
};

type InitNativeWebViewSettings = {
    title: string,
    transparent?: boolean,
    innerSize?: { width: number, height: number },
    outerPosition?: { top: number, left: number },
    getPath?: (src: string) => string,
    onDrop?: (drop: Drop) => void,
    onMessage?: (message: any) => void,
};

type Path = {
    url: string,
    path: string,
    mimetype: string
};

type Drop =
    | { type: "fileDropHovered", paths: string[] }
    | { type: "fileDropDropped", paths: string[] }
    | { type: "fileDropCancelled" };

type Message =
    | { type: "start" }
    | { type: "end" }
    | { type: "message", message: string }
    | { type: "log", log: string /* stringify as array */ }
    | { type: "error", message: string, source: string, line: number, column: string, stack: string }
    | { type: "path", url: string }
    | Drop;

class NativeWebView {
    private transparent: boolean = false;
    private settings: Partial<NativeWebViewSettings>;
    private childProcess: null | ChildProcessWithoutNullStreams = null;
    private closeListeners: Array<(status: null | Error) => void> = [];

    private getPath: (file: string) => string = (file) => resolve(process.cwd(), file);
    private onMessage: (message: any) => void = (message) => console.log("Message:", message);
    private onDrop: (drop: Drop) => void = (drop) => { };

    constructor(settings: InitNativeWebViewSettings, childProcess: ChildProcessWithoutNullStreams) {
        const { title, transparent, getPath, onDrop, onMessage, ...other } = settings;
        this.transparent = transparent || false;
        this.settings = { title: { title }, ...other };

        if (getPath) this.getPath = getPath;
        if (onDrop) this.onDrop = onDrop;
        if (onMessage) this.onMessage = onMessage;

        this.initChildProcess(childProcess);
    }

    // web common MIME types
    private getMimetype(path: string): string {
        const extension = extname(path);

        switch (extension) {
            case ".htm":
            case ".html": return "text/html";
            case ".js": return "text/javascript";
            case ".png": return "image/png";
            case ".css": return "text/css";
            case ".gif": return "image/gif";
            case ".ico": return "image/vnd.microsoft.icon";
            case ".jpg":
            case ".jpeg": return "image/jpeg";
            case ".json": return "application/json";
            case ".svg": return "image/svg+xml";
            default: return "application/octet-stream";
        }
    }

    private sendPath(path: Path) {
        if (this.childProcess === null) throw Error("WebView is closed.");

        this.childProcess.stdin.write(`${IO_CHANNEL_PREFIX}${JSON.stringify({ type: "path", ...path })}\n`);
    }

    private sendSetting<Type extends keyof NativeWebViewSettings>(type: Type, setting: NativeWebViewSettings[Type]) {
        if (this.childProcess === null) throw Error("WebView is closed.");

        this.childProcess.stdin.write(`${IO_CHANNEL_PREFIX}${JSON.stringify({ type, ...setting })}\n`);
    }

    private receiveChannel(message: Message) {
        switch (message.type) {
            case "start":
                return;
            case "end":
                this.closing(null);
                return;
            case "message":
                this.onMessage(JSON.parse(decodeURIComponent(message.message)));
                return;
            case "path":
                let file = "";
                if (message.url === "nwv://index.html" || message.url === "nwv://index.html/") {
                    file = "index.html";
                } else {
                    file = message.url.replace("nwv://index.html/", "").replace("nwv://", "");
                }
                const path = this.getPath(file);
                this.sendPath({ url: message.url, path, mimetype: this.getMimetype(path) });
                return;

            case "log":
                console.log("WebView:", ...JSON.parse(decodeURIComponent(message.log)));
                return;
            case "error":
                console.error("WebView Error:", decodeURIComponent(message.message), message.source, "line:", message.line, "column:", message.column, decodeURIComponent(message.stack));
                return;

            case "fileDropHovered":
                this.onDrop(message);
                return;
            case "fileDropDropped":
                this.onDrop(message);
                return;
            case "fileDropCancelled":
                this.onDrop(message);
                return;

            default:
                console.error("Unknown message type.", message);
        }
    }

    private parseIOMessage(out: string) {
        if (out.startsWith(IO_CHANNEL_PREFIX)) {
            let message = null;
            try {
                message = JSON.parse(out.substring(IO_CHANNEL_PREFIX.length));
            } catch (e) {
                // mac drop the \n between two messages is on end of data stream
                const index = out.indexOf(IO_CHANNEL_PREFIX, IO_CHANNEL_PREFIX.length);
                if (index > 0) {
                    this.parseIOMessage(out.substring(0, index));
                    this.parseIOMessage(out.substring(index));
                } else {
                    console.error("Message parse error. ", e);
                }
            }

            this.receiveChannel(message);
            if (message) {
            }
        } else {
            console.log("WebView:", out);
        }
    }

    private initChildProcess(childProcess: ChildProcessWithoutNullStreams) {
        if (this.childProcess !== null) throw Error("WebView is already running.");

        this.childProcess = childProcess;

        // error
        this.childProcess.stderr.on("data", (data) => {
            this.closing(new Error(`WebView error: ${data}`));
        });

        this.childProcess.on("close", (code) => {
            this.closing(null);
        });

        // receive message
        let out = "";
        this.childProcess.stdout.on("data", (data: string) => {
            data.toString().split("\n").forEach((row, i) => {
                if (i == 0) {
                    out += row.trim();
                } else {
                    this.parseIOMessage(out);
                    out = row.trim();
                }
            });
        });

        // TODO: update setting with first run
        for (const [type, value] of Object.entries(this.settings)) {
            if (value !== null) {
                this.set(type as keyof NativeWebViewSettings, value);
            }
        }
    }

    private closing(status: null | Error) {
        this.closeListeners.forEach(l => l(status));
        this.closeListeners = [];
        if (this.childProcess !== null) {
            this.childProcess.kill();
            this.childProcess = null;
        }
    }

    set<Type extends keyof NativeWebViewSettings>(type: Type, setting: NativeWebViewSettings[Type]) {
        this.sendSetting(type, setting);
    }

    // ------ most used --------

    eval(js: string) {
        this.set("eval", { js });
    }

    close() {
        this.set("close", {});
    }

    setTitle(title: string) {
        this.set("title", { title });
    }

    onClose(): Promise<null | Error> {
        if (this.childProcess === null) {
            return Promise.resolve(null);
        } else {
            return new Promise(resolve => this.closeListeners.push(resolve));
        }
    }
}

export default async function openWebView(settings: InitNativeWebViewSettings): Promise<NativeWebView> {
    const { title, transparent } = settings;

    const args = ["--title", JSON.stringify(title)];
    if (transparent === true) args.push("--transparent");

    if (!isBinaryFile()) await downloadBinaryFile();

    const childProcess = spawn(getBinaryPath(), args, {});
    childProcess.stdin.setDefaultEncoding("utf-8");

    const wv = new NativeWebView(settings, childProcess);

    return wv;
}
