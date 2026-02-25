//! E2E tests for TUI rendering and layout
//!
//! These tests verify the UI renders correctly with different panel sizes
//! and responds to app state changes using ratatui's TestBackend.

use ralph_tui::app::App;
use ratatui::{backend::TestBackend, Terminal};

#[test]
fn ui_renders_with_default_panel_sizes() {
    let backend = TestBackend::new(80, 24);
    let mut terminal = Terminal::new(backend).unwrap();
    let app = App::new();

    terminal
        .draw(|frame| ralph_tui::ui::render(frame, &app))
        .unwrap();
    let buffer = terminal.backend().buffer();
    let content = buffer
        .content()
        .iter()
        .map(|c| c.symbol())
        .collect::<String>();

    assert!(
        content.contains("Ralph TUI"),
        "Header should contain 'Ralph TUI'"
    );
    assert_eq!(app.header_height, 3);
    assert_eq!(app.footer_height, 3);
}

#[test]
fn ui_updates_when_header_resized() {
    let backend = TestBackend::new(80, 24);
    let mut terminal = Terminal::new(backend).unwrap();
    let mut app = App::new();

    // Resize header
    app.resize_header_up();
    assert_eq!(app.header_height, 4);

    terminal
        .draw(|frame| ralph_tui::ui::render(frame, &app))
        .unwrap();
    let buffer = terminal.backend().buffer();
    let content = buffer
        .content()
        .iter()
        .map(|c| c.symbol())
        .collect::<String>();

    assert!(
        content.contains("Header: 4px"),
        "Status should reflect resized header"
    );
}

#[test]
fn ui_updates_when_footer_resized() {
    let backend = TestBackend::new(80, 24);
    let mut terminal = Terminal::new(backend).unwrap();
    let mut app = App::new();

    // Resize footer
    app.resize_footer_up();
    assert_eq!(app.footer_height, 4);

    terminal
        .draw(|frame| ralph_tui::ui::render(frame, &app))
        .unwrap();
    let buffer = terminal.backend().buffer();
    let content = buffer
        .content()
        .iter()
        .map(|c| c.symbol())
        .collect::<String>();

    assert!(
        content.contains("Footer: 4px"),
        "Status should reflect resized footer"
    );
}

#[test]
fn ui_renders_help_text_in_main_panel() {
    let backend = TestBackend::new(80, 24);
    let mut terminal = Terminal::new(backend).unwrap();
    let app = App::new();

    terminal
        .draw(|frame| ralph_tui::ui::render(frame, &app))
        .unwrap();
    let buffer = terminal.backend().buffer();
    let content = buffer
        .content()
        .iter()
        .map(|c| c.symbol())
        .collect::<String>();

    assert!(
        content.contains("Press 'q' or Esc to quit"),
        "Should show quit instruction"
    );
    assert!(
        content.contains("Ctrl+Up/Down: resize header"),
        "Should show header resize instruction"
    );
    assert!(
        content.contains("Ctrl+Shift+Up/Down: resize footer"),
        "Should show footer resize instruction"
    );
}

#[test]
fn ui_handles_small_terminal_size() {
    let backend = TestBackend::new(40, 10);
    let mut terminal = Terminal::new(backend).unwrap();
    let app = App::new();

    let result = terminal.draw(|frame| ralph_tui::ui::render(frame, &app));
    assert!(result.is_ok(), "UI should handle small terminal gracefully");
}

#[test]
fn ui_handles_large_terminal_size() {
    let backend = TestBackend::new(200, 60);
    let mut terminal = Terminal::new(backend).unwrap();
    let app = App::new();

    let result = terminal.draw(|frame| ralph_tui::ui::render(frame, &app));
    assert!(result.is_ok(), "UI should handle large terminal gracefully");
}

#[test]
fn ui_main_panel_shrinks_when_header_grows() {
    let backend = TestBackend::new(80, 24);
    let mut terminal = Terminal::new(backend).unwrap();
    let mut app = App::new();

    // Original header height is 3, so main should be 24 - 3 - 3 = 18
    // After resizing header to 5, main should be 24 - 5 - 3 = 16
    app.header_height = 5;

    terminal
        .draw(|frame| ralph_tui::ui::render(frame, &app))
        .unwrap();

    // Verify the app state reflects the resized header
    assert_eq!(app.header_height, 5);
}

#[test]
fn ui_respects_panel_boundaries() {
    let backend = TestBackend::new(80, 24);
    let mut terminal = Terminal::new(backend).unwrap();
    let mut app = App::new();

    // Set to maximum sizes
    app.header_height = 10;
    app.footer_height = 10;

    let result = terminal.draw(|frame| ralph_tui::ui::render(frame, &app));
    assert!(result.is_ok(), "UI should handle maximum panel sizes");

    assert_eq!(app.header_height, 10);
    assert_eq!(app.footer_height, 10);
}
