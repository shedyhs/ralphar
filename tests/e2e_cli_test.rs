//! E2E tests for ralph-tui binary.
//!
//! Note: The TUI application takes over the terminal, so automated E2E tests
//! are limited. The binary_exists test verifies the binary can be built.
//! Full TUI testing requires manual verification or specialized terminal testing tools.

/// Verify the binary exists and can be built
#[test]
fn binary_exists() {
    let path = assert_cmd::cargo::cargo_bin!("ralph-tui");
    assert!(path.exists(), "Binary should exist at {:?}", path);
}

/// Verify the library exports version correctly
#[test]
fn library_version_exported() {
    let version = ralph_tui::version();
    assert!(!version.is_empty());
    // Version should match Cargo.toml
    assert!(version.starts_with("0."));
}
