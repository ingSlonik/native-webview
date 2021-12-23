use std::os::raw::c_char;
use std::ffi::{CStr, CString};

use web_view::*;

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
) -> *mut WebView<'static, ()> {

    let title = unsafe { CStr::from_ptr(c_title) };
    let content = unsafe { CStr::from_ptr(c_content) };

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

    Box::into_raw(Box::new(webview))
}

#[no_mangle]
pub extern fn run(webview: *mut WebView<'static, ()>) {
    unsafe { Box::from_raw(webview) }.run().unwrap();
}

#[no_mangle]
pub extern fn get_handle(webview: *mut WebView<'static, ()>) -> *mut Handle<()> {
    let handle = unsafe { Box::from_raw(webview) }.handle();
    Box::into_raw(Box::new(handle))
}

#[no_mangle]
pub extern fn exit(handle: *mut Handle<()>) {
    unsafe { Box::from_raw(handle) }.dispatch(|webview| {
        webview.exit();
        Ok(())
    }).unwrap();
}

#[no_mangle]
pub extern fn eval(handle: Box<Handle<()>>, c_js: *const c_char) {
    let js = unsafe { CStr::from_ptr(c_js) };
    handle.dispatch(move |webview| webview.eval(js.to_str().unwrap())).unwrap();
}

#[no_mangle]
pub extern fn set_title(handle: Box<Handle<()>>, c_title: *const c_char) {
    let title = unsafe { CStr::from_ptr(c_title) };
    handle.dispatch(move |webview| webview.set_title(title.to_str().unwrap())).unwrap();
}
