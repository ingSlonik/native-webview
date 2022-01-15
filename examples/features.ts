import { resolve } from "path";
import NativeWebView, { NativeWebViewSettings } from "../src/index";

const nwv = new NativeWebView(
    {
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
                nwv.set(message.type, message);
            }
        }
    }
);

(async () => {
    await nwv.run();
    console.log("WebView closed");
})();

nwv.set("windowIcon", { path: resolve(__dirname, "icon.png") });
