import { resolve } from "path";
import NativeWebView, { NativeWebViewSettings } from "../src/index";

const nwv = new NativeWebView(
    {
        title: "Hello title",
        innerSize: { width: 420, height: 240 },
        windowIcon: { path: resolve(__dirname, "icon.png") },
    },
    (nmv) => resolve(__dirname, nmv.replace("nwv://", "")),
    (message: string) => {
        console.log("Message from WebView:", message);
        const { type, ...setting } = JSON.parse(message);
        if (typeof type === "string") {
            nwv.set(type as keyof NativeWebViewSettings, setting);
        }
    }
);

(async () => {
    await nwv.run();
    console.log("WebView closed");
})();

setTimeout(() => nwv.eval("sendMessage('I am here!');"), 2000);
setTimeout(() => nwv.setTitle("New title"), 5000);
// setTimeout(() => nwv.close(), 10000);