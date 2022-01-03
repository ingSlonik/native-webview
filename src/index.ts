import { platform } from 'process';
import { resolve, extname } from "path";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";

const IO_CHANNEL_PREFIX = "_ioc:";

const SYSTEM = platform === "darwin" ? "darwin" :
    platform === "win32" ? "windows" :
        "linux";

const PROGRAM_PATH = resolve(__dirname, "..", "dist", `${SYSTEM}_x86_64`, `native-webview${SYSTEM === "windows" ? ".exe" : ""}`);

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
} | {
    type: "setSize",
    width: number,
    height: number,
} | {
    type: "setWindowIcon",
    path: string,
};

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
    size: { width: number, height: number },
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
    windowIcon: null | string,
    getPath: (nwv: string) => string,
    onMessage: (message: any) => void,
};

const defaultNativeWebViewSettings: NativeWebViewSettings = {
    title: "Native WebView",
    size: { width: 680, height: 420 },
    windowIcon: null,
    getPath: (nwv) => resolve(__dirname, "..", "dist", nwv.replace("nwv://", "")),
    onMessage: (message) => console.log("Message:", message),
};

export default class NativeWebView {
    private settings: NativeWebViewSettings;
    private childProcess: null | ChildProcessWithoutNullStreams = null;

    constructor(settings: Partial<NativeWebViewSettings>) {
        this.settings = { ...defaultNativeWebViewSettings, ...settings };
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
                console.log("WebView:", ...JSON.parse(decodeURIComponent(message.log)));
                return;
            case "error":
                console.error("WebView Error:", message.url, message.line, decodeURIComponent(message.error));
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
            this.setSize(this.settings.size.width, this.settings.size.height);
            if (this.settings.windowIcon) this.setWindowIcon(this.settings.windowIcon);
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

    setSize(width: number, height: number) {
        this.settings.size = { width, height };

        if (this.childProcess !== null)
            this.sendChannel({ type: "setSize", width, height });
    }

    setWindowIcon(path: string) {
        this.settings.windowIcon = path;

        if (this.childProcess !== null)
            this.sendChannel({ type: "setWindowIcon", path });
    }

    close() {
        this.sendChannel({ type: "close" });
    }
}
