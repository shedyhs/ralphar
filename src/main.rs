// src/main.rs
use std::time::Duration;

use ralph_tui::{
    app::App,
    event::{handle_key_event, Action, AppEvent},
    event_handler::EventHandler,
    terminal,
};
use tokio::signal;

#[tokio::main]
async fn main() -> std::io::Result<()> {
    // 1. Initialize terminal (includes TTY check)
    let mut tui = terminal::init()?;

    // 2. Set up panic hook to restore terminal on panic
    let original_hook = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |panic_info| {
        let _ = terminal::restore();
        original_hook(panic_info);
    }));

    // 3. Initialize app state
    let mut app = App::new();

    // 4. Initialize event handler (250ms tick rate)
    let mut events = EventHandler::new(Duration::from_millis(250));

    // 5. Main loop with tokio::select! for events + signals
    while app.running {
        // Render UI
        tui.draw(|frame| ralph_tui::ui::render(frame, &app))?;

        // Handle events with signal handling
        tokio::select! {
            event = events.next() => {
                if let Some(event) = event {
                    match event {
                        AppEvent::Key(key) => {
                            match handle_key_event(key) {
                                Action::Quit => app.quit(),
                                Action::ResizeHeaderUp => app.resize_header_up(),
                                Action::ResizeHeaderDown => app.resize_header_down(),
                                Action::ResizeFooterUp => app.resize_footer_up(),
                                Action::ResizeFooterDown => app.resize_footer_down(),
                                Action::None => {}
                            }
                        }
                        AppEvent::Tick => {
                            // Future: update app state on tick
                        }
                        AppEvent::Resize(_, _) => {
                            // Handled automatically by ratatui on next draw
                        }
                    }
                }
            }
            _ = signal::ctrl_c() => {
                app.quit();
            }
        }
    }

    // 6. Restore terminal
    terminal::restore()?;

    Ok(())
}
