// src/event_handler.rs
use std::time::Duration;

use crossterm::event::{self, Event};
use tokio::sync::mpsc;

use crate::event::AppEvent;

pub struct EventHandler {
    rx: mpsc::UnboundedReceiver<AppEvent>,
    _tx: mpsc::UnboundedSender<AppEvent>,
}

impl EventHandler {
    pub fn new(tick_rate: Duration) -> Self {
        let (tx, rx) = mpsc::unbounded_channel();
        let event_tx = tx.clone();

        tokio::spawn(async move {
            loop {
                // Note: poll() is blocking but with short timeout, acceptable for P1.
                // Could use crossterm's async features in future for fully non-blocking.
                match event::poll(tick_rate) {
                    Ok(true) => {
                        match event::read() {
                            Ok(Event::Key(key)) => {
                                if event_tx.send(AppEvent::Key(key)).is_err() {
                                    break;
                                }
                            }
                            Ok(Event::Resize(w, h)) => {
                                if event_tx.send(AppEvent::Resize(w, h)).is_err() {
                                    break;
                                }
                            }
                            Ok(_) => {} // Ignore other events (mouse, focus, paste)
                            Err(_) => {
                                // Terminal read error - likely terminal closed
                                break;
                            }
                        }
                    }
                    Ok(false) => {
                        // No event within tick_rate, send Tick
                        if event_tx.send(AppEvent::Tick).is_err() {
                            break;
                        }
                    }
                    Err(_) => {
                        // Poll error - terminal likely unavailable
                        break;
                    }
                }
            }
        });

        Self { rx, _tx: tx }
    }

    pub async fn next(&mut self) -> Option<AppEvent> {
        self.rx.recv().await
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn event_handler_channel_types() {
        // Type-level test - if this compiles, channels are correctly typed
        fn assert_send<T: Send>() {}
        assert_send::<AppEvent>();
    }
}
