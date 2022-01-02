import { platform } from 'process';
import { resolve, extname } from "path";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";

const IO_CHANNEL_PREFIX = "_ioc:";

const SYSTEM = platform === "darwin" ? "darwin" :
    platform === "win32" ? "windows" :
        "linux";
const PROGRAM_PATH = resolve(__dirname, "..", "dist", `${SYSTEM}_x86_64`, "native-webview");

type ChannelOut = {
    type: "run"
} | {
    type: "close"
} | {
    type: "path",
    url: string,
    path: string,
    mimetype: string,
} | {
    type: "eval",
    js: string,
} | {
    type: "setTitle",
    title: string,
}

type ChannelIn = {
    type: "message",
    message: string,
} | {
    type: "log",
    log: string, // stringify as array
} | {
    type: "error",
    error: string,
    url: string,
    line: number,
} | {
    type: "path",
    url: string,
};

export type NativeWebViewSettings = {
    title: string,
    getPath: (nwv: string) => string,
    onMessage: (message: any) => void,
};

export default class NativeWebView {
    private settings: NativeWebViewSettings;
    private childProcess: null | ChildProcessWithoutNullStreams = null;

    constructor(settings: NativeWebViewSettings) {
        this.settings = settings;
    }

    // web Common MIME types
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

    private sendChannel(message: ChannelOut) {
        if (this.childProcess === null) throw Error("WebView is not running.");

        // console.log("sendChannel", message);
        this.childProcess.stdin.write(`${IO_CHANNEL_PREFIX}${JSON.stringify(message)}\n`);
    }

    private receiveChannel(message: ChannelIn) {
        // console.log("receiveChannel", message);
        switch (message.type) {
            case "message":
                this.settings.onMessage(JSON.parse(decodeURIComponent(message.message)));
                return;
            case "path":
                const path = this.settings.getPath(message.url);
                this.sendChannel({ type: "path", url: message.url, path, mimetype: this.getMimetype(path) });
                return;

            case "log":
                console.log("FE:", ...JSON.parse(decodeURIComponent(message.log)));
                return;
            case "error":
                console.error("FE:", message.url, message.line, decodeURIComponent(message.error));
                return;
            default:
                console.error("Unknown message type.", message);
        }
    }

    async run(): Promise<void> {
        if (this.childProcess !== null) throw Error("WebView is already running.");

        return new Promise((resolve, reject) => {

            this.childProcess = spawn(PROGRAM_PATH, [], {});
            this.childProcess.stdin.setDefaultEncoding("utf-8");

            // error
            this.childProcess.stderr.on('data', (data) => {
                reject(new Error(`WebView error: ${data}`));
            });

            this.childProcess.on('close', (code) => {
                this.childProcess = null;
                resolve();
                // console.log(`child process exited with code ${code}`);
            });

            // receive message
            let out = "";
            this.childProcess.stdout.on('data', (data: string) => {

                data.toString().split("\n").forEach((row, i) => {
                    if (i == 0) {
                        out += row.trim();
                    } else {
                        if (out.startsWith(IO_CHANNEL_PREFIX)) {
                            let message = null;
                            try {
                                message = JSON.parse(out.substring(IO_CHANNEL_PREFIX.length));
                            } catch (e) {
                                console.error("Message parse error. ", e);
                            }

                            if (message) {
                                this.receiveChannel(message);
                            }
                        } else {
                            console.log("FE:", data.toString());
                        }

                        out = row.trim();
                    }
                });
            });

            // TODO: update setting with first run
            this.setTitle(this.settings.title);
        });
    }

    eval(js: string) {
        this.sendChannel({ type: "eval", js });
    }

    setTitle(title: string) {
        this.settings.title = title;

        if (this.childProcess !== null)
            this.sendChannel({ type: "setTitle", title });
    }

    close() {
        this.sendChannel({ type: "close" });
    }
}
