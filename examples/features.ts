import { resolve } from "path";
import NativeWebView, { NativeWebViewSettings } from "../src/index";

const nwv = new NativeWebView(
    {
        title: "Hello title",
        innerSize: { width: 640, height: 420 },
    },
    (nmv) => {
        const path = resolve(__dirname, nmv.replace("nwv://", ""));
        console.log("nmv file:", nmv, path);
        return path;
    },
    (message: { type: keyof NativeWebViewSettings } & NativeWebViewSettings[keyof NativeWebViewSettings]) => {
        console.log("Message from WebView:", message);
        if (typeof message.type === "string") {
            nwv.set(message.type, message);
        }
    }
);

(async () => {
    await nwv.run();
    console.log("WebView closed");
})();

nwv.set("windowIcon", { path: resolve(__dirname, "icon.png") });
