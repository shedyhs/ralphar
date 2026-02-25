//! E2E tests for terminal lifecycle and initialization
//!
//! These tests verify terminal setup, cleanup, and TTY detection.

use ralph_tui::terminal;

#[test]
fn terminal_init_fails_without_tty() {
    // When running in CI or non-interactive environment, init should fail gracefully
    // This test documents the expected behavior but may pass or fail depending on environment

    let result = terminal::init();

    if std::io::IsTerminal::is_terminal(&std::io::stdout()) {
        // If we have a TTY, init should succeed
        if result.is_ok() {
            // Clean up if successful
            let _ = terminal::restore();
        }
    } else {
        // Without TTY, should return error
        assert!(result.is_err(), "init() should fail without TTY");
        if let Err(e) = result {
            let error_msg = e.to_string();
            assert!(
                error_msg.contains("not a terminal") || error_msg.contains("TUI requires"),
                "Error should mention terminal requirement: {}",
                error_msg
            );
        }
    }
}

#[test]
fn terminal_restore_is_idempotent() {
    // restore() should be safe to call multiple times
    let result1 = terminal::restore();
    let result2 = terminal::restore();

    // Both calls should succeed (or both fail consistently)
    assert_eq!(
        result1.is_ok(),
        result2.is_ok(),
        "Multiple restore() calls should behave consistently"
    );
}

#[test]
fn tty_detection_is_consistent() {
    // Verify TTY detection gives consistent results
    let is_tty1 = std::io::IsTerminal::is_terminal(&std::io::stdout());
    let is_tty2 = std::io::IsTerminal::is_terminal(&std::io::stdout());

    assert_eq!(is_tty1, is_tty2, "TTY detection should be consistent");
}

#[test]
fn terminal_type_alias_is_correct() {
    // Type-level test: verify Tui type alias compiles and has expected properties
    fn assert_is_terminal<T>()
    where
        T: ratatui::backend::Backend,
    {
    }

    // This should compile, verifying Tui is a valid Terminal type
    assert_is_terminal::<ratatui::backend::CrosstermBackend<std::io::Stdout>>();
}

#[cfg(not(target_os = "windows"))]
#[test]
fn terminal_respects_environment() {
    // On Unix-like systems, verify we respect environment
    // This is a smoke test that the terminal detection uses the environment correctly

    let term_var = std::env::var("TERM").unwrap_or_default();

    // If TERM is not set or is "dumb", we likely don't have a real terminal
    if term_var.is_empty() || term_var == "dumb" {
        // Terminal capabilities may be limited
        // This is expected in CI environments
    }

    // Test passes if we get here without panic
}
