export type Configuration<M extends {}> = {
    title: string,
    content: string,
    sizeWidth: number,
    sizeHeight: number,
    resizable: boolean,
    debug: boolean,
    frameless: boolean,
    visible: boolean,
    minSizeWidth: boolean,
    minSizeHeight: boolean,
    invokeHandler: (message: M) => void,
};

type WebView = number; // pointer
type Handle = number; // pointer

export function create(conf: Partial<Configuration>): WebView;
export function getHandle(webview: WebView): Handle;
export function run(webview: WebView): Promise<void>;
export function eval(handle: Handle, js: string): void;
export function setTitle(handle: Handle, title: string): void;
export function exit(handle: Handle): void;
