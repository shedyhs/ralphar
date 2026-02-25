//! E2E tests for keyboard event handling
//!
//! These tests verify that keyboard inputs are correctly translated
//! to actions and app state changes.

use crossterm::event::{KeyCode, KeyEvent, KeyModifiers};
use ralph_tui::{
    app::App,
    event::{handle_key_event, Action},
};

#[test]
fn e2e_quit_keys_stop_app() {
    let mut app = App::new();
    assert!(app.running, "App should start in running state");

    // Test 'q' key
    let action = handle_key_event(KeyEvent::new(KeyCode::Char('q'), KeyModifiers::NONE));
    assert_eq!(action, Action::Quit, "q key should return Quit action");

    match action {
        Action::Quit => app.quit(),
        _ => {}
    }
    assert!(!app.running, "App should stop after quit action");
}

#[test]
fn e2e_esc_key_quits() {
    let mut app = App::new();

    let action = handle_key_event(KeyEvent::new(KeyCode::Esc, KeyModifiers::NONE));
    assert_eq!(action, Action::Quit, "Esc key should return Quit action");

    match action {
        Action::Quit => app.quit(),
        _ => {}
    }
    assert!(!app.running, "App should stop after Esc");
}

#[test]
fn e2e_ctrl_c_quits() {
    let mut app = App::new();

    let action = handle_key_event(KeyEvent::new(KeyCode::Char('c'), KeyModifiers::CONTROL));
    assert_eq!(action, Action::Quit, "Ctrl+C should return Quit action");

    match action {
        Action::Quit => app.quit(),
        _ => {}
    }
    assert!(!app.running, "App should stop after Ctrl+C");
}

#[test]
fn e2e_resize_header_with_keyboard() {
    let mut app = App::new();
    let initial_height = app.header_height;

    // Resize header up
    let action = handle_key_event(KeyEvent::new(KeyCode::Up, KeyModifiers::CONTROL));
    assert_eq!(
        action,
        Action::ResizeHeaderUp,
        "Ctrl+Up should resize header up"
    );

    match action {
        Action::ResizeHeaderUp => app.resize_header_up(),
        _ => {}
    }
    assert_eq!(
        app.header_height,
        initial_height + 1,
        "Header should increase by 1"
    );

    // Resize header down
    let action = handle_key_event(KeyEvent::new(KeyCode::Down, KeyModifiers::CONTROL));
    assert_eq!(
        action,
        Action::ResizeHeaderDown,
        "Ctrl+Down should resize header down"
    );

    match action {
        Action::ResizeHeaderDown => app.resize_header_down(),
        _ => {}
    }
    assert_eq!(
        app.header_height, initial_height,
        "Header should return to initial height"
    );
}

#[test]
fn e2e_resize_footer_with_keyboard() {
    let mut app = App::new();
    let initial_height = app.footer_height;

    // Resize footer up
    let action = handle_key_event(KeyEvent::new(
        KeyCode::Up,
        KeyModifiers::CONTROL | KeyModifiers::SHIFT,
    ));
    assert_eq!(
        action,
        Action::ResizeFooterUp,
        "Ctrl+Shift+Up should resize footer up"
    );

    match action {
        Action::ResizeFooterUp => app.resize_footer_up(),
        _ => {}
    }
    assert_eq!(
        app.footer_height,
        initial_height + 1,
        "Footer should increase by 1"
    );

    // Resize footer down
    let action = handle_key_event(KeyEvent::new(
        KeyCode::Down,
        KeyModifiers::CONTROL | KeyModifiers::SHIFT,
    ));
    assert_eq!(
        action,
        Action::ResizeFooterDown,
        "Ctrl+Shift+Down should resize footer down"
    );

    match action {
        Action::ResizeFooterDown => app.resize_footer_down(),
        _ => {}
    }
    assert_eq!(
        app.footer_height, initial_height,
        "Footer should return to initial height"
    );
}

#[test]
fn e2e_header_resize_respects_boundaries() {
    let mut app = App::new();
    app.header_height = 3; // MIN is 3

    // Try to resize below minimum
    let action = handle_key_event(KeyEvent::new(KeyCode::Down, KeyModifiers::CONTROL));
    match action {
        Action::ResizeHeaderDown => app.resize_header_down(),
        _ => {}
    }
    assert_eq!(app.header_height, 3, "Header should stay at minimum");

    // Resize to maximum
    app.header_height = 10; // MAX is 10
    let action = handle_key_event(KeyEvent::new(KeyCode::Up, KeyModifiers::CONTROL));
    match action {
        Action::ResizeHeaderUp => app.resize_header_up(),
        _ => {}
    }
    assert_eq!(app.header_height, 10, "Header should stay at maximum");
}

#[test]
fn e2e_footer_resize_respects_boundaries() {
    let mut app = App::new();
    app.footer_height = 3; // MIN is 3

    // Try to resize below minimum
    let action = handle_key_event(KeyEvent::new(
        KeyCode::Down,
        KeyModifiers::CONTROL | KeyModifiers::SHIFT,
    ));
    match action {
        Action::ResizeFooterDown => app.resize_footer_down(),
        _ => {}
    }
    assert_eq!(app.footer_height, 3, "Footer should stay at minimum");

    // Resize to maximum
    app.footer_height = 10; // MAX is 10
    let action = handle_key_event(KeyEvent::new(
        KeyCode::Up,
        KeyModifiers::CONTROL | KeyModifiers::SHIFT,
    ));
    match action {
        Action::ResizeFooterUp => app.resize_footer_up(),
        _ => {}
    }
    assert_eq!(app.footer_height, 10, "Footer should stay at maximum");
}

#[test]
fn e2e_regular_keys_ignored() {
    let app = App::new();
    let initial_state = format!("{:?}", app);

    // Test that regular keys produce no action
    for key_char in ['a', 'b', 'x', 'z', '1', ' '] {
        let action = handle_key_event(KeyEvent::new(KeyCode::Char(key_char), KeyModifiers::NONE));
        assert_eq!(
            action,
            Action::None,
            "Regular key '{}' should be ignored",
            key_char
        );
    }

    // App state should be unchanged
    let final_state = format!("{:?}", app);
    assert_eq!(
        initial_state, final_state,
        "App state should not change from unhandled keys"
    );
}

#[test]
fn e2e_multiple_resize_operations() {
    let mut app = App::new();

    // Perform a sequence of resize operations
    let operations = vec![
        (KeyCode::Up, KeyModifiers::CONTROL, Action::ResizeHeaderUp),
        (KeyCode::Up, KeyModifiers::CONTROL, Action::ResizeHeaderUp),
        (
            KeyCode::Up,
            KeyModifiers::CONTROL | KeyModifiers::SHIFT,
            Action::ResizeFooterUp,
        ),
        (
            KeyCode::Down,
            KeyModifiers::CONTROL,
            Action::ResizeHeaderDown,
        ),
    ];

    for (code, mods, expected_action) in operations {
        let action = handle_key_event(KeyEvent::new(code, mods));
        assert_eq!(
            action, expected_action,
            "Key combination should produce expected action"
        );

        match action {
            Action::ResizeHeaderUp => app.resize_header_up(),
            Action::ResizeHeaderDown => app.resize_header_down(),
            Action::ResizeFooterUp => app.resize_footer_up(),
            Action::ResizeFooterDown => app.resize_footer_down(),
            _ => {}
        }
    }

    // Verify final state: started at 3, +2, -1 = 4 for header
    assert_eq!(
        app.header_height, 4,
        "Header should be at 4 after operations"
    );
    // Verify final state: started at 3, +1 = 4 for footer
    assert_eq!(
        app.footer_height, 4,
        "Footer should be at 4 after operations"
    );
}
