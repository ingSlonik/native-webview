import { resolve } from "path";
import NativeWebView, { NativeWebViewSettings } from "../src/index";

const nwv = new NativeWebView({
    title: "Transparent window",
    transparent: true,
    innerSize: { width: 420, height: 150 },
    getPath: (src) => resolve(__dirname, "transparent.html"),
    onMessage: (message: { type: keyof NativeWebViewSettings } & NativeWebViewSettings[keyof NativeWebViewSettings]) => {
        console.log("Message from WebView:", message);
        if (typeof message.type === "string") {
            nwv.set(message.type, message);
        }
    }
});

(async () => {
    await nwv.run();
    console.log("WebView closed");
})();
