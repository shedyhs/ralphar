//! Integration tests for ralph-tui

use ralph_tui::version;

#[test]
fn library_exports_version() {
    let v = version();
    assert!(v.starts_with("0."));
}
