import { resolve } from "path";
import NativeWebView, { NativeWebViewSettings } from "../src/index";

const nwv = new NativeWebView(
    {
        title: "Hello title",
        innerSize: { width: 640, height: 420 },
        windowIcon: { path: resolve(__dirname, "icon.png") },
    },
    (nmv) => resolve(__dirname, nmv.replace("nwv://", "")),
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
