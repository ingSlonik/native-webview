use std::fs::{canonicalize, read};
use std::io::{self, BufRead};
use std::thread;

use crossbeam_channel::{bounded, Receiver};
use serde::Serialize;
use serde_json::Value;

use wry::{
    application::{
        dpi::LogicalSize,
        event::{Event, StartCause, WindowEvent},
        event_loop::{ControlFlow, EventLoop},
        window::WindowBuilder,
    },
    http::ResponseBuilder,
    webview::{RpcResponse, WebViewBuilder},
};

#[derive(Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
enum Message {
    Log {
        log: String,
    },
    Message {
        message: String,
    },
    Error {
        error: String,
        url: String,
        line: u64,
    },
    Path {
        url: String,
    },
}

struct Path {
    path: String,
    mimetype: String,
}
const IO_CHANNEL_PREFIX: &str = "_ioc:";
const INIT_SCRIPT: &str = r#"
console.logOriginal = console.log;
console.log = function () {
    rpc.call("log", Array.prototype.splice.call(arguments, 0));
};
window.onerror = function(error, url, line) {
    rpc.call("error", error, url, line);
};

function sendMessage(message) {
    rpc.call("message", JSON.stringify(message));
}
"#;

fn send_ioc_message(message: Message) {
    println!(
        "{}{}",
        IO_CHANNEL_PREFIX,
        serde_json::to_string(&message).unwrap()
    )
}

fn get_path(url: &str, rx: Receiver<Value>) -> Path {
    send_ioc_message(Message::Path {
        url: url.to_string(),
    });

    loop {
        let message = rx.recv().unwrap();
        let message_url = message["url"].as_str().unwrap();

        if message_url == url {
            return Path {
                path: message["path"].as_str().unwrap().to_string(),
                mimetype: message["mimetype"].as_str().unwrap().to_string(),
            };
        }
    }
}

fn main() -> wry::Result<()> {
    let (s_path, r_path) = bounded(0);

    let event_loop = EventLoop::with_user_event();
    let window = WindowBuilder::new()
        // .with_title("Native WebView")
        .build(&event_loop)?;
    let webview = WebViewBuilder::new(window)?
        .with_initialization_script(INIT_SCRIPT)
        .with_custom_protocol("nwv".into(), move |request| {
            let path = get_path(request.uri(), r_path.clone());
            let content = read(canonicalize(path.path)?)?;

            ResponseBuilder::new()
                .mimetype(&path.mimetype)
                .body(content)
        })
        .with_url("nwv://index.html")?
        .with_rpc_handler(|_window, mut req| {
            match req.method.as_ref() {
                "message" => send_ioc_message(Message::Message {
                    message: req.params.unwrap()[0].to_string(),
                }),
                "log" => send_ioc_message(Message::Log {
                    log: req.params.unwrap()[0].to_string(),
                }),
                "error" => send_ioc_message(Message::Error {
                    error: req.params.as_ref().unwrap()[0]
                        .as_str()
                        .unwrap()
                        .to_string(),
                    url: req.params.as_ref().unwrap()[1]
                        .as_str()
                        .unwrap()
                        .to_string(),
                    line: req.params.unwrap()[2].as_u64().unwrap(),
                }),
                _ => println!("Unknown RPC message type {}", req.method),
            }

            Some(RpcResponse::new_result(req.id.take(), None))
        })
        .build()?;

    let event_proxy = event_loop.create_proxy();
    thread::spawn(move || loop {
        let stdin = io::stdin();
        let input = stdin.lock().lines().next();
        let line = input
            .expect("No lines in buffer")
            .expect("Failed to read line")
            .trim()
            .to_string();

        if line.starts_with(IO_CHANNEL_PREFIX) {
            let message: Value = serde_json::from_str(&line[IO_CHANNEL_PREFIX.len()..]).unwrap();
            let message_type = message["type"].as_str().unwrap();

            if message_type == "path" {
                s_path.send(message).unwrap();
            } else {
                event_proxy.send_event(message).unwrap();
            }
        }
    });

    event_loop.run(move |event, _, control_flow| {
        *control_flow = ControlFlow::Wait;

        match event {
            Event::UserEvent(message) => {
                let message_type = message["type"].as_str().unwrap();
                let window = webview.window();

                match message_type {
                    "setTitle" => window.set_title(&message["title"].as_str().unwrap()),
                    "setSize" => {
                        let size = LogicalSize::new(
                            message["width"].as_f64().unwrap(),
                            message["height"].as_f64().unwrap(),
                        );
                        window.set_inner_size(size);
                    }
                    "close" => *control_flow = ControlFlow::Exit,
                    "eval" => webview
                        .evaluate_script(&message["js"].as_str().unwrap())
                        .unwrap(),
                    _ => println!("Unknown message type {}", message_type),
                }
            }
            Event::NewEvents(StartCause::Init) => println!("Native WebView has started!"),
            Event::WindowEvent {
                event: WindowEvent::CloseRequested,
                ..
            } => *control_flow = ControlFlow::Exit,
            _ => (),
        }
    });
}
