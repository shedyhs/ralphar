// src/app.rs

/// Minimum height for header/footer panels
const MIN_FIXED_PANEL_HEIGHT: u16 = 3;
/// Maximum height for header/footer panels
const MAX_FIXED_PANEL_HEIGHT: u16 = 10;

#[derive(Debug)]
pub struct App {
    pub running: bool,
    /// Height of the header panel (resizable)
    pub header_height: u16,
    /// Height of the footer/status panel (resizable)
    pub footer_height: u16,
}

impl Default for App {
    fn default() -> Self {
        Self::new()
    }
}

impl App {
    pub fn new() -> Self {
        Self {
            running: true,
            header_height: 3,
            footer_height: 3,
        }
    }

    pub fn quit(&mut self) {
        self.running = false;
    }

    /// Increase header panel height (shrinks main panel)
    pub fn resize_header_up(&mut self) {
        if self.header_height < MAX_FIXED_PANEL_HEIGHT {
            self.header_height += 1;
        }
    }

    /// Decrease header panel height (grows main panel)
    pub fn resize_header_down(&mut self) {
        if self.header_height > MIN_FIXED_PANEL_HEIGHT {
            self.header_height -= 1;
        }
    }

    /// Increase footer panel height (shrinks main panel)
    pub fn resize_footer_up(&mut self) {
        if self.footer_height < MAX_FIXED_PANEL_HEIGHT {
            self.footer_height += 1;
        }
    }

    /// Decrease footer panel height (grows main panel)
    pub fn resize_footer_down(&mut self) {
        if self.footer_height > MIN_FIXED_PANEL_HEIGHT {
            self.footer_height -= 1;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn new_app_is_running() {
        let app = App::new();
        assert!(app.running);
    }

    #[test]
    fn quit_stops_app() {
        let mut app = App::new();
        app.quit();
        assert!(!app.running);
    }

    #[test]
    fn default_panel_heights() {
        let app = App::new();
        assert_eq!(app.header_height, 3);
        assert_eq!(app.footer_height, 3);
    }

    #[test]
    fn resize_header_up_increases_height() {
        let mut app = App::new();
        app.resize_header_up();
        assert_eq!(app.header_height, 4);
    }

    #[test]
    fn resize_header_down_decreases_height() {
        let mut app = App::new();
        app.header_height = 5;
        app.resize_header_down();
        assert_eq!(app.header_height, 4);
    }

    #[test]
    fn resize_header_respects_min_height() {
        let mut app = App::new();
        app.header_height = MIN_FIXED_PANEL_HEIGHT;
        app.resize_header_down();
        assert_eq!(app.header_height, MIN_FIXED_PANEL_HEIGHT);
    }

    #[test]
    fn resize_header_respects_max_height() {
        let mut app = App::new();
        app.header_height = MAX_FIXED_PANEL_HEIGHT;
        app.resize_header_up();
        assert_eq!(app.header_height, MAX_FIXED_PANEL_HEIGHT);
    }

    #[test]
    fn resize_footer_up_increases_height() {
        let mut app = App::new();
        app.resize_footer_up();
        assert_eq!(app.footer_height, 4);
    }

    #[test]
    fn resize_footer_down_decreases_height() {
        let mut app = App::new();
        app.footer_height = 5;
        app.resize_footer_down();
        assert_eq!(app.footer_height, 4);
    }
}
