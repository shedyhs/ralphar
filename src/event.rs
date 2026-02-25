// src/event.rs
use crossterm::event::{KeyCode, KeyEvent, KeyModifiers};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AppEvent {
    Tick,
    Key(KeyEvent),
    Resize(u16, u16),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Action {
    Quit,
    ResizeHeaderUp,
    ResizeHeaderDown,
    ResizeFooterUp,
    ResizeFooterDown,
    None,
}

/// Handle keyboard events and return corresponding action.
/// Keybindings:
/// - q, Esc, Ctrl+C: Quit
/// - Ctrl+Up: Resize header up (increase height)
/// - Ctrl+Down: Resize header down (decrease height)
/// - Ctrl+Shift+Up: Resize footer up (increase height)
/// - Ctrl+Shift+Down: Resize footer down (decrease height)
pub fn handle_key_event(key: KeyEvent) -> Action {
    let ctrl = key.modifiers.contains(KeyModifiers::CONTROL);
    let shift = key.modifiers.contains(KeyModifiers::SHIFT);

    match key.code {
        KeyCode::Char('q') => Action::Quit,
        KeyCode::Char('c') if ctrl => Action::Quit,
        KeyCode::Esc => Action::Quit,
        KeyCode::Up if ctrl && !shift => Action::ResizeHeaderUp,
        KeyCode::Down if ctrl && !shift => Action::ResizeHeaderDown,
        KeyCode::Up if ctrl && shift => Action::ResizeFooterUp,
        KeyCode::Down if ctrl && shift => Action::ResizeFooterDown,
        _ => Action::None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn q_key_quits() {
        let key = KeyEvent::new(KeyCode::Char('q'), KeyModifiers::NONE);
        assert_eq!(handle_key_event(key), Action::Quit);
    }

    #[test]
    fn ctrl_c_quits() {
        let key = KeyEvent::new(KeyCode::Char('c'), KeyModifiers::CONTROL);
        assert_eq!(handle_key_event(key), Action::Quit);
    }

    #[test]
    fn esc_quits() {
        let key = KeyEvent::new(KeyCode::Esc, KeyModifiers::NONE);
        assert_eq!(handle_key_event(key), Action::Quit);
    }

    #[test]
    fn other_keys_do_nothing() {
        let key = KeyEvent::new(KeyCode::Char('a'), KeyModifiers::NONE);
        assert_eq!(handle_key_event(key), Action::None);
    }

    #[test]
    fn ctrl_up_resizes_header_up() {
        let key = KeyEvent::new(KeyCode::Up, KeyModifiers::CONTROL);
        assert_eq!(handle_key_event(key), Action::ResizeHeaderUp);
    }

    #[test]
    fn ctrl_down_resizes_header_down() {
        let key = KeyEvent::new(KeyCode::Down, KeyModifiers::CONTROL);
        assert_eq!(handle_key_event(key), Action::ResizeHeaderDown);
    }

    #[test]
    fn ctrl_shift_up_resizes_footer_up() {
        let key = KeyEvent::new(KeyCode::Up, KeyModifiers::CONTROL | KeyModifiers::SHIFT);
        assert_eq!(handle_key_event(key), Action::ResizeFooterUp);
    }

    #[test]
    fn ctrl_shift_down_resizes_footer_down() {
        let key = KeyEvent::new(KeyCode::Down, KeyModifiers::CONTROL | KeyModifiers::SHIFT);
        assert_eq!(handle_key_event(key), Action::ResizeFooterDown);
    }
}
