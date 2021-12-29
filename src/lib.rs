use std::os::raw::c_char;
use std::ffi::{CStr, CString};

use std::ptr;
// use std::rc::Rc;
use std::sync::mpsc;
// use std::sync::{Arc, Mutex};
// use std::alloc::{alloc, dealloc, Layout};
use std::thread;

use web_view::*;

pub struct NWV {
    pub webview: WebView<'static, ()>,
    pub handle: Handle<()>,
}

// struct Pointer {
//     pub ptr: *mut u8,
// }

// unsafe impl Send for NWV {}
// unsafe impl<T> !Send for *mut T where T: ?NWV {}
// unsafe impl Send for Pointer {}

#[no_mangle]
pub extern fn create(
    c_title: *const c_char,
    c_content: *const c_char,
    size_width: i32,
    size_height: i32,
    resizable: bool,
    debug: bool,
    frameless: bool,
    visible: bool,
    min_size_width: i32,
    min_size_height: i32,
    invoke_handler: extern fn(*const c_char)
) -> *const Handle<()> {

    let title = unsafe { CStr::from_ptr(c_title) };
    let content = unsafe { CStr::from_ptr(c_content) };

    // let handle = webview.handle();

    let (tx, rx) = mpsc::channel::<Handle<()>>();
    // let data = Arc::new(Mutex::new(webview));

    // let nwv = NWV { webview, handle };
    // let webview_ptr = Box::into_raw(Box::new(webview));
    // let webview_ptr = unsafe { alloc(Layout::new::<WebView<'static, ()>>()) };
    // let po = Pointer { ptr: webview_ptr };
    // let shared_api= Arc::new(Mutex::new(po));

    let h = thread::spawn(move || {
        // let webview = rx.recv().unwrap();
        // webview.run().unwrap()
        // let mut data = data.lock().unwrap();
        // data.run().unwrap();

        // unsafe { ptr::read(shared_api.lock().unwrap().ptr as *mut WebView<'static, ()>) }.run().unwrap();

        let webview = web_view::builder()
            .title(title.to_str().unwrap())
            .content(Content::Html(content.to_str().unwrap()))
            .size(size_width, size_height)
            .resizable(resizable)
            .debug(debug)
            .frameless(frameless)
            .visible(visible)
            .min_size(min_size_width, min_size_height)
            .user_data(())
            .invoke_handler(move |_webview, arg| {
                invoke_handler(CString::new(arg)?.as_ptr());
                Ok(())
            })
            .build()
            .unwrap();

        let handle = webview.handle();
        tx.send(handle).unwrap();

        webview.run().unwrap();
    });

    // tx.send(Box::new(webview)).unwrap();
    // &handle as *const Handle<()>

    h.join().unwrap();

    // let nwv = NWV { webview, handle };
    // &nwv as *const NWV

    let handle = rx.recv().unwrap();
    &handle as *const Handle<()>
}

#[no_mangle]
pub extern fn run(nwv: *const NWV) {
    println!("RUN rust");
    unsafe { ptr::read(nwv) }.webview.run().unwrap();

    // thread::spawn(move || {
        // let webview = rx.recv().unwrap();
        // webview.run().unwrap()
        // let mut data = data.lock().unwrap();
        // data.run().unwrap();

        // unsafe { ptr::read(nwv) }.webview.run().unwrap();
    // });
}

/*
#[no_mangle]
pub extern fn get_handle(webview: *mut WebView<'static, ()>) -> *mut WebView<'static, ()> /* -> *mut Handle<()> */ {
    /* unsafe {
        let handle = ptr::read(webview).handle();
        let handle_ptr = alloc(Layout::new::<Handle<()>>()) as *mut Handle<()>;
        ptr::write(handle_ptr, handle);
        handle_ptr
    } */
    webview
}
*/

#[no_mangle]
pub extern fn exit(nwv: *const NWV) {
    unsafe { ptr::read(nwv) }.handle.dispatch(|webview| {
        webview.exit();
        Ok(())
    }).unwrap();
}

#[no_mangle]
pub extern fn eval(nwv: *const NWV, c_js: *const c_char) -> *const NWV {
    let js = unsafe { CStr::from_ptr(c_js) };
    unsafe { ptr::read(nwv) }.handle.dispatch(move |webview| webview.eval(js.to_str().unwrap())).unwrap();
    nwv
}

#[no_mangle]
pub extern fn set_title(nwv: *const NWV, c_title: *const c_char) -> *const NWV {
    let title = unsafe { CStr::from_ptr(c_title) };
    println!("Title: {}", title.to_str().unwrap());
    unsafe { ptr::read(nwv) }.handle.dispatch(move |webview| webview.set_title(title.to_str().unwrap())).unwrap();
    nwv
}
