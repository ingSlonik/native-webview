# native-webview

This packages is nodejs wrap of the [wry](https://github.com/tauri-apps/wry) library.

## Features

- `Focus` - focus the window and webview
- `Close` - close the window
- `Eval` - eval javascript in webview
- `Title` - title of window
- `WindowIcon` - icon of window (only Window and Linux)
- `Resizable` - allow user to resize
- `InnerSize` - set size
- `MinInnerSize` - set minimum size
- `MaxInnerSize` - set maximum size
- `OuterPosition` - set position of window
- `AlwaysOnTop` - window always on top
- `Decorations` - turn on/off decorations (window border)
- `Fullscreen` - set fullscreen
- `Maximized` - maximize the window
- `Minimized` - minimize the window
- `Files` - handle files from file system

## Usage

```js
import { resolve } from "path";
import NativeWebView from "native-webview";

const nwv = new NativeWebView(
    {
        title: "Hello title",
        innerSize: { width: 640, height: 420 },
    },
    file => resolve(__dirname, file),
    message => console.log("Message from WebView:", message)
);

await nwv.run();
```

## Examples

    $ npm run example -- examples/features.ts
