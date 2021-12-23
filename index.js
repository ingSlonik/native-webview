var { join } = require("path");
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

var webview = lib.create(
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
console.log({webview});

// const handle = lib.get_handle(webview);
// console.log({handle, webview});
// 
// setTimeout(() => lib.exit(handle), 1000);

lib.run(webview);
console.log("RUN");