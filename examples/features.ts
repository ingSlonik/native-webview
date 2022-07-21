import { resolve } from "path";
import OpenWebView, { NativeWebViewSettings } from "../src/index";

async function runExample() {
    const wv = await OpenWebView({
        title: "Hello title",
        innerSize: { width: 640, height: 420 },
        getPath: (src) => {
            const path = resolve(__dirname, src);
            console.log("Src:", src, "->", path);
            return path;
        },
        onDrop: (drop) => {
            console.log("Drop:", drop);
        },
        onMessage: (message: { type: keyof NativeWebViewSettings } & NativeWebViewSettings[keyof NativeWebViewSettings]) => {
            console.log("Message from WebView:", message);
            if (typeof message.type === "string") {
                wv.set(message.type, message);
            }
        }
    });

    wv.set("windowIcon", { path: resolve(__dirname, "icon.png") });

    await wv.onClose();
    console.log("WebView closed");
}

runExample();
