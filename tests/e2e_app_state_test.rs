//! E2E tests for application state management
//!
//! These tests verify the complete lifecycle of app state transitions
//! from initialization through user interactions to shutdown.

use ralph_tui::app::App;

#[test]
fn e2e_app_lifecycle_initialization() {
    let app = App::new();

    // Verify initial state
    assert!(app.running, "New app should be running");
    assert_eq!(
        app.header_height, 3,
        "Header should start at default height"
    );
    assert_eq!(
        app.footer_height, 3,
        "Footer should start at default height"
    );
}

#[test]
fn e2e_app_lifecycle_shutdown() {
    let mut app = App::new();

    // Simulate user quitting
    app.quit();

    assert!(!app.running, "App should not be running after quit");
}

#[test]
fn e2e_app_state_after_panel_resize_sequence() {
    let mut app = App::new();

    // Simulate a realistic user interaction sequence
    // User increases header size for more info
    app.resize_header_up();
    app.resize_header_up();
    assert_eq!(app.header_height, 5, "Header should grow to 5");

    // User decides it's too big, reduces it
    app.resize_header_down();
    assert_eq!(app.header_height, 4, "Header should shrink to 4");

    // User increases footer size
    app.resize_footer_up();
    assert_eq!(app.footer_height, 4, "Footer should grow to 4");

    // Verify app is still running
    assert!(
        app.running,
        "App should still be running after resize operations"
    );
}

#[test]
fn e2e_app_survives_extreme_resize_attempts() {
    let mut app = App::new();

    // Try to resize header way beyond limits
    for _ in 0..20 {
        app.resize_header_up();
    }

    // Should be clamped at maximum
    assert_eq!(app.header_height, 10, "Header should be clamped at maximum");
    assert!(app.running, "App should still be running");

    // Try to resize below minimum
    for _ in 0..20 {
        app.resize_header_down();
    }

    // Should be clamped at minimum
    assert_eq!(app.header_height, 3, "Header should be clamped at minimum");
    assert!(app.running, "App should still be running");
}

#[test]
fn e2e_app_default_trait_implementation() {
    let app1 = App::new();
    let app2 = App::default();

    // Default should be equivalent to new()
    assert_eq!(app1.running, app2.running);
    assert_eq!(app1.header_height, app2.header_height);
    assert_eq!(app1.footer_height, app2.footer_height);
}

#[test]
fn e2e_app_maintains_independent_panel_sizes() {
    let mut app = App::new();

    // Resize header
    app.resize_header_up();
    let header_height = app.header_height;
    let footer_height = app.footer_height;

    // Verify footer wasn't affected
    assert_eq!(header_height, 4);
    assert_eq!(
        footer_height, 3,
        "Footer should not change when header resizes"
    );

    // Resize footer
    app.resize_footer_up();
    app.resize_footer_up();

    // Verify header wasn't affected
    assert_eq!(
        app.header_height, 4,
        "Header should not change when footer resizes"
    );
    assert_eq!(app.footer_height, 5);
}

#[test]
fn e2e_app_state_is_queryable() {
    let app = App::new();

    // Verify we can read all state fields
    let running = app.running;
    let header = app.header_height;
    let footer = app.footer_height;

    // State should be valid
    assert!(running);
    assert!(header >= 3 && header <= 10);
    assert!(footer >= 3 && footer <= 10);
}

#[test]
fn e2e_multiple_apps_are_independent() {
    let mut app1 = App::new();
    let app2 = App::new();

    // Modify app1
    app1.resize_header_up();
    app1.quit();

    // Verify app2 is unaffected
    assert_eq!(
        app2.header_height, 3,
        "app2 should have default header height"
    );
    assert!(app2.running, "app2 should still be running");
}
