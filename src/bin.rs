use std::thread;

use web_view::*;

fn main() {
    println!("Hello, world!");

    let join_handle = thread::spawn(move || {
        println!("Hello, thread!");
        let webview_result = web_view::builder()
            .title("test")
            .content(Content::Html("<body><h1>Ahoj</h1></body>"))
            .size(320, 200)
            // .resizable(resizable)
            // .debug(debug)
            // .frameless(frameless)
            // .visible(visible)
            // .min_size(min_size_width, min_size_height)
            .user_data(())
            .invoke_handler(move |_webview, arg| {
                //     invoke_handler(CString::new(arg)?.as_ptr());
                println!("handler: {}", arg);
                Ok(())
            })
            .build();

        println!("After build");

        let webview = match webview_result {
            Ok(webview) => webview,
            Err(e) => panic!("{}", e),
        };

        // let handle = webview.handle();
        // tx.send(handle).unwrap();

        match webview.run() {
            Ok(_) => println!("OK"),
            Err(e) => panic!("{}", e),
        };
    });

    join_handle.join().unwrap();
}
