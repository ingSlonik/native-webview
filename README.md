# native-webview

This packages is nodejs wrap of the [wry](https://github.com/tauri-apps/wry) library.

## Usage

```js
import { resolve } from "path";
import NativeWebView from "native-webview";

const nwv = new NativeWebView(
    {
        title: "Hello title",
        innerSize: { width: 640, height: 420 },
        windowIcon: { path: resolve(__dirname, "icon.png") },
    },
    nmv => resolve(__dirname, nmv.replace("nwv://", "")),
    message => console.log("Message from WebView:", message)
);

await nwv.run();
```

## Examples

    $ npm run example -- examples/features.ts
