# native-webview

> For now it is just alpha version. For public project consider using alternatives.

This is nodejs wrap of [wry](https://github.com/tauri-apps/wry) library.

## Usage

```js
import { resolve } from "path";
import NativeWebView from "native-webview";

const nwv = new NativeWebView({
    title: "My app",
    size: { width: 320, height: 240 },
    windowIcon: resolve(__dirname, "icon.png"),
    getPath: (nmv) => resolve(__dirname, "public", nmv.replace("nwv://", "")),
    onMessage: (message: string) => console.log("Message from WebView:", message),
});

await nwv.run();
```

## Examples

    $ npm run example -- examples/hello.ts
