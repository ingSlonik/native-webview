import { resolve } from "path";
import NativeWebView from "../src/index";

const nwv = new NativeWebView({
    title: "Hello title",
    getPath: (nmv) => resolve(__dirname, nmv.replace("nwv://", "")),
    onMessage: (message: string) => {
        console.log("Message from WebView:", message);
    }
});

(async () => {
    await nwv.run();
    console.log("WebView closed");
})();

setTimeout(() => nwv.eval("sendMessage('I am here!');"), 2000);
setTimeout(() => nwv.setTitle("Nový nadpis"), 5000);
// setTimeout(() => nwv.close(), 10000);