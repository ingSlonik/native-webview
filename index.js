var { join, resolve } = require("path");
const {
    Worker, isMainThread, parentPort, workerData
  } = require('worker_threads');


var ffi = require('ffi-napi');

var lib = ffi.Library(join(__dirname, './target/release/libnative_webview'), {
    create: ['pointer', ['string', 'string', 'int', 'int', 'bool', 'bool', 'bool', 'bool', 'int', 'int', 'pointer']],
    get_handle: ['pointer', ['pointer']],
    run: ['void', ['pointer']],
    exit: ["void", ["pointer"]],
    eval: ["void", ["pointer", "string"]],
    set_title: ["void", ["pointer", "string"]],
});

var callback = ffi.Callback('void', ['string'], (message => {
    console.log({ message });
}));

const html = `<html>
    <head>
        <meta charset="UTF-8"> 
    </head>
    <body>
        <h1>Ahoj</h1>
        <button onclick="external.invoke('Ahoj +ěšíčěšý 5');">Klik</button>
    </body>
</html>`;

let nwv = lib.create(
    "Title of window",
    html,
    800,
    600,
    true,
    false,
    false,
    true,
    300,
    300,
    callback,
);
console.log({nwv});


// const handle = lib.get_handle(webview);
// console.log({handle, webview});
// 
// setTimeout(() => {
//     console.log("New title JS")
//     lib.set_title(nwv, "Nový...");
// }, 2000);
// setTimeout(() => lib.exit(nwv), 5000);

// (async () => {
//     console.log("RUN");
//     const result = await run(nwv);
//     console.log("STOP", {result});
// })();

function run(nwv) {
    return new Promise((resolve, reject) => {
        lib.run(nwv);
        /*
        const worker = new Worker("./worker.js", { /*workerData: "ahoj" nwv });
      //  worker.on('message', resolve);
        worker.on('message', message => console.log(message));
      worker.on('error', reject);
      worker.on('exit', (code) => {
        if (code !== 0)
          reject(new Error(`Worker stopped with exit code ${code}`));
      });
      */
    });
}
