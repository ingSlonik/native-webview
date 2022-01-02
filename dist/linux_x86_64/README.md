# Native WebView for Linux

> Waiting for binary code.

Native WebView uses tao and its related libraries for window creation and wry also needs WebKitGTK for WebView. So please make sure following packages are installed:

## Arch Linux / Manjaro:

```bash
sudo pacman -S webkit2gtk libappindicator-gtk3
```

## Debian / Ubuntu:

```bash
sudo apt install libwebkit2gtk-4.0-dev libappindicator3-dev
```

## Fedora

```bash
sudo dnf install gtk3-devel webkit2gtk3-devel libappindicator-gtk3-devel
```