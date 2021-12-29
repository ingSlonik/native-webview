const {
    Worker, isMainThread, parentPort, workerData
  } = require('worker_threads');
  var { join, resolve } = require("path");

  var ffi = require('ffi-napi');

  var lib = ffi.Library(join(__dirname, './target/release/libnative_webview'), {
      create: ['pointer', ['string', 'string', 'int', 'int', 'bool', 'bool', 'bool', 'bool', 'int', 'int', 'pointer']],
      get_handle: ['pointer', ['pointer']],
      run: ['void', ['pointer']],
      exit: ["void", ["pointer"]],
      eval: ["void", ["pointer", "string"]],
      set_title: ["void", ["pointer", "string"]],
  });

  console.log("Worker", { isMainThread, workerData });

  parentPort.postMessage("Test");
  parentPort.postMessage(workerData);

  // lib.run(workerData);