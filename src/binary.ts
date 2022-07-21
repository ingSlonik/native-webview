import { platform } from 'process';
import { existsSync, readFileSync, createWriteStream } from "fs";
import { resolve } from 'path';
import { get } from "https";
import type { IncomingMessage } from 'http';

const SYSTEM = platform === "darwin" ? "darwin" :
    platform === "win32" ? "windows" :
        "linux";

const ARCH = ["darwin", "linux"].includes(SYSTEM) && process.arch.includes("arm") ? "arm" : "x86";

const BINARY_NAME = `${SYSTEM}-${ARCH}-64-webview${SYSTEM === "windows" ? ".exe" : ""}`
const BINARY_PATH = resolve(__dirname, "..", "dist", BINARY_NAME);

const URL = "https://github.com/ingSlonik/native-webview/releases/download";

function getVersion() {
    const packJSON = readFileSync(resolve(__dirname, "..", "package.json"), "utf-8");
    const pack = JSON.parse(packJSON);
    return pack.version;
}

export function isBinaryFile(): boolean {
    return existsSync(BINARY_PATH);
}

async function getResponse(url: string): Promise<IncomingMessage> {
    return new Promise((resolve, reject) => {
        get(url, response => {
            const status = response.statusCode || 0;
            const location = response.headers.location;

            if (status === 200) {
                resolve(response);
            } else if (status >= 300 && status < 400 && location) {
                getResponse(location)
                    .then(resolve)
                    .catch(reject);
            } else {
                reject();
            }
        }).on("error", reject);
    });
}

async function writeFile(res: IncomingMessage, path: string): Promise<string> {
    return new Promise(resolve => {
        const file = createWriteStream(path, { mode: 755 });
        res.pipe(file);
        file.on("finish", () => {
            file.close();
            resolve(path);
        });
    });
}

export async function downloadBinaryFile() {
    const version = getVersion();
    const url = `${URL}/v${version}/${BINARY_NAME}`;

    console.log("Downloading native-webview binary file for your OS.")

    try {
        const res = await getResponse(url);
        await writeFile(res, BINARY_PATH);
    } catch (e) {
        if (e) throw e;
        throw new Error(`Native-webview binary file v${version} for your OS is not found: ${URL}`);
    }
}

export function getBinaryPath() {
    return BINARY_PATH;
}

if (process.argv.includes("--download-binary")) {
    if (!isBinaryFile()) downloadBinaryFile();
}
