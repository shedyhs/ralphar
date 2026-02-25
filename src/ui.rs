// src/ui.rs
use ratatui::{
    layout::{Constraint, Direction, Layout, Rect},
    style::{Color, Style},
    widgets::{Block, Borders, Paragraph},
    Frame,
};

use crate::app::App;

pub fn render(frame: &mut Frame, app: &App) {
    let chunks = calculate_layout(frame.area(), app.header_height, app.footer_height);

    render_header(frame, chunks[0]);
    render_main(frame, chunks[1], app);
    render_status(frame, chunks[2], app);
}

fn render_header(frame: &mut Frame, area: Rect) {
    let header = Paragraph::new("Ralph TUI")
        .style(Style::default().fg(Color::Cyan))
        .block(Block::default().borders(Borders::BOTTOM));
    frame.render_widget(header, area);
}

fn render_main(frame: &mut Frame, area: Rect, _app: &App) {
    let content = Paragraph::new("Press 'q' or Esc to quit\nCtrl+Up/Down: resize header\nCtrl+Shift+Up/Down: resize footer")
        .block(Block::default().borders(Borders::ALL).title("Main"));
    frame.render_widget(content, area);
}

fn render_status(frame: &mut Frame, area: Rect, app: &App) {
    let status = format!(
        "q: Quit | Header: {}px | Footer: {}px",
        app.header_height, app.footer_height
    );
    let status_widget = Paragraph::new(status)
        .style(Style::default().fg(Color::DarkGray))
        .block(Block::default().borders(Borders::TOP));
    frame.render_widget(status_widget, area);
}

/// Calculate layout chunks with dynamic panel heights.
/// Private function - tests access via `use super::*` in test module.
fn calculate_layout(area: Rect, header_height: u16, footer_height: u16) -> Vec<Rect> {
    Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(header_height),
            Constraint::Min(1),
            Constraint::Length(footer_height),
        ])
        .split(area)
        .to_vec()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn layout_creates_three_chunks() {
        let area = Rect::new(0, 0, 80, 24);
        let chunks = calculate_layout(area, 3, 3);
        assert_eq!(chunks.len(), 3);
    }

    #[test]
    fn default_header_and_footer_are_height_3() {
        let area = Rect::new(0, 0, 80, 24);
        let chunks = calculate_layout(area, 3, 3);
        assert_eq!(chunks[0].height, 3); // Header
        assert_eq!(chunks[2].height, 3); // Footer
    }

    #[test]
    fn main_content_fills_remaining_space() {
        let area = Rect::new(0, 0, 80, 24);
        let chunks = calculate_layout(area, 3, 3);
        // 24 total - 3 header - 3 footer = 18 main
        assert_eq!(chunks[1].height, 18);
    }

    #[test]
    fn resized_panels_affect_layout() {
        let area = Rect::new(0, 0, 80, 24);
        let chunks = calculate_layout(area, 5, 4);
        assert_eq!(chunks[0].height, 5); // Header resized to 5
        assert_eq!(chunks[2].height, 4); // Footer resized to 4
        // 24 total - 5 header - 4 footer = 15 main
        assert_eq!(chunks[1].height, 15);
    }
}
