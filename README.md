# native-webview

This packages is nodejs wrap of the [wry](https://github.com/tauri-apps/wry) library.

## Features

- `Focus` - focus the window and webview
- `Close` - close the window
- `Eval` - eval javascript in webview
- `Title` - title of window
- `Transparent` - window with transparent background
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

```bash
$ npm run example -- examples/features.ts
$ npm run example -- examples/transparent.ts
```

## System specific

### Windows

Just double click 😉.

### MacOS

Dynamic change window icon is not supported. You can easily use icon with creation *.app file.

### Linux

Native WebView uses WebKitGTK for WebView. So please make sure following packages are installed:

#### Arch Linux / Manjaro:

```bash
sudo pacman -S webkit2gtk libappindicator-gtk3
```

#### Debian / Ubuntu:

```bash
sudo apt install libwebkit2gtk-4.0-dev libappindicator3-dev
```

#### Fedora

```bash
sudo dnf install gtk3-devel webkit2gtk3-devel libappindicator-gtk3-devel
```