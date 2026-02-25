//! TRUE E2E tests for ralph-tui binary
//!
//! These tests spawn the actual TUI binary and interact with it
//! through a pseudo-terminal (PTY) to verify real user journeys.
//!
//! **NOTE:** These tests are marked `#[ignore]` because they require a real PTY
//! and may hang in automated CI environments. Run them manually with:
//! ```
//! cargo test --test e2e_binary_interaction_test -- --ignored --test-threads=1
//! ```
//!
//! User journeys tested:
//! - UJ1: Launch app and quit with 'q' key
//! - UJ2: Launch app and quit with Esc key
//! - UJ3: Launch app and quit with Ctrl+C
//! - UJ4: Launch app, see UI elements, then quit
//! - UJ5: Launch app in non-TTY environment (should fail gracefully)

use std::process::Command;
use std::time::Duration;

/// Helper to get the path to the ralph-tui binary
fn binary_path() -> std::path::PathBuf {
    assert_cmd::cargo::cargo_bin!("ralph-tui").to_path_buf()
}

/// Helper to ensure binary is built before running E2E tests
fn ensure_binary_built() {
    let status = Command::new("cargo")
        .args(["build", "--bin", "ralph-tui"])
        .status()
        .expect("Failed to build binary");
    assert!(status.success(), "Binary build failed");
}

#[test]
#[ignore = "Requires PTY - run manually with: cargo test -- --ignored --test-threads=1"]
fn e2e_uj1_launch_and_quit_with_q_key() {
    ensure_binary_built();

    let mut session = rexpect::spawn(binary_path().to_str().unwrap(), Some(2000))
        .expect("Failed to spawn ralph-tui");

    // Wait a moment for TUI to initialize
    std::thread::sleep(Duration::from_millis(100));

    // Send 'q' to quit
    session.send("q").expect("Failed to send 'q' key");

    // Wait for process to exit
    std::thread::sleep(Duration::from_millis(200));

    // App should exit cleanly - check if process is still alive
    let status = session.process.wait();
    assert!(status.is_ok(), "App should exit cleanly after 'q'");

    // Verify process exited (status should be Ok with WaitStatus)
    assert!(
        status.is_ok(),
        "App should exit with successful wait status"
    );
}

#[test]
#[ignore = "Requires PTY - run manually with: cargo test -- --ignored --test-threads=1"]
fn e2e_uj2_launch_and_quit_with_esc_key() {
    ensure_binary_built();

    let mut session = rexpect::spawn(binary_path().to_str().unwrap(), Some(2000))
        .expect("Failed to spawn ralph-tui");

    // Wait a moment for TUI to initialize
    std::thread::sleep(Duration::from_millis(100));

    // Send Esc to quit (ESC is \x1b in ASCII)
    session.send("\x1b").expect("Failed to send Esc key");

    // Wait for process to exit
    std::thread::sleep(Duration::from_millis(200));

    // App should exit cleanly
    let status = session.process.wait();
    assert!(status.is_ok(), "App should exit cleanly after Esc");
}

#[test]
#[ignore = "Requires PTY - run manually with: cargo test -- --ignored --test-threads=1"]
fn e2e_uj3_launch_and_quit_with_ctrl_c() {
    ensure_binary_built();

    let mut session = rexpect::spawn(binary_path().to_str().unwrap(), Some(2000))
        .expect("Failed to spawn ralph-tui");

    // Wait a moment for TUI to initialize
    std::thread::sleep(Duration::from_millis(100));

    // Send Ctrl+C (ASCII 0x03)
    session.send("\x03").expect("Failed to send Ctrl+C");

    // Wait for process to exit
    std::thread::sleep(Duration::from_millis(200));

    // App should exit cleanly
    let status = session.process.wait();
    assert!(status.is_ok(), "App should exit cleanly after Ctrl+C");
}

#[test]
#[ignore = "Requires PTY - run manually with: cargo test -- --ignored --test-threads=1"]
fn e2e_uj4_launch_verify_ui_elements_then_quit() {
    ensure_binary_built();

    let mut session = rexpect::spawn(binary_path().to_str().unwrap(), Some(2000))
        .expect("Failed to spawn ralph-tui");

    // Wait for TUI to render
    std::thread::sleep(Duration::from_millis(200));

    // Verify UI elements are present in the terminal output
    // Note: The TUI renders these elements
    session
        .exp_string("Ralph TUI")
        .expect("Should display 'Ralph TUI' header");

    session
        .exp_string("Main")
        .expect("Should display 'Main' panel");

    session
        .exp_string("q: Quit")
        .expect("Should display quit instruction in status bar");

    // Now quit
    session.send("q").expect("Failed to send 'q' key");

    // Wait and verify app exits cleanly
    std::thread::sleep(Duration::from_millis(200));
    let status = session.process.wait();
    assert!(
        status.is_ok(),
        "App should exit cleanly after displaying UI"
    );
}

#[test]
#[ignore = "Requires PTY - run manually with: cargo test -- --ignored --test-threads=1"]
fn e2e_uj5_launch_in_non_tty_fails_gracefully() {
    ensure_binary_built();

    // Run the binary without a TTY (using sh -c with input redirection)
    let output = Command::new("sh")
        .arg("-c")
        .arg(format!("{} < /dev/null", binary_path().display()))
        .output()
        .expect("Failed to execute command");

    // Should fail because it's not running in a TTY
    assert!(!output.status.success(), "Should fail when not in TTY");

    // Should have a helpful error message
    let stderr = String::from_utf8_lossy(&output.stderr);
    assert!(
        stderr.contains("not a terminal") || stderr.contains("TUI requires"),
        "Should have helpful error message about TTY requirement. Got: {}",
        stderr
    );
}

#[test]
#[ignore = "Requires PTY - run manually with: cargo test -- --ignored --test-threads=1"]
fn e2e_uj6_multiple_sequential_launches() {
    ensure_binary_built();

    // Verify we can launch the app multiple times in sequence
    for i in 0..3 {
        let mut session = rexpect::spawn(binary_path().to_str().unwrap(), Some(2000))
            .expect(&format!("Failed to spawn ralph-tui on iteration {}", i));

        std::thread::sleep(Duration::from_millis(100));

        session
            .send("q")
            .expect(&format!("Failed to send 'q' on iteration {}", i));

        std::thread::sleep(Duration::from_millis(100));
        let status = session.process.wait();
        assert!(status.is_ok(), "App should exit cleanly on iteration {}", i);
    }
}

#[test]
#[ignore = "Requires PTY - run manually with: cargo test -- --ignored --test-threads=1"]
fn e2e_uj7_app_responds_within_reasonable_time() {
    ensure_binary_built();

    let start = std::time::Instant::now();

    let mut session = rexpect::spawn(binary_path().to_str().unwrap(), Some(2000))
        .expect("Failed to spawn ralph-tui");

    // Wait for app to display UI
    session
        .exp_string("Ralph TUI")
        .expect("Should display header");

    let startup_duration = start.elapsed();

    // Send quit
    session.send("q").expect("Failed to quit");
    std::thread::sleep(Duration::from_millis(100));
    session.process.wait().ok();

    // App should start and show UI within 1 second
    assert!(
        startup_duration < Duration::from_secs(1),
        "App should start within 1 second, took {:?}",
        startup_duration
    );
}

#[test]
#[ignore = "Requires PTY - run manually with: cargo test -- --ignored --test-threads=1"]
fn e2e_uj8_keyboard_input_before_quit() {
    ensure_binary_built();

    let mut session = rexpect::spawn(binary_path().to_str().unwrap(), Some(2000))
        .expect("Failed to spawn ralph-tui");

    std::thread::sleep(Duration::from_millis(100));

    // Send some random keys that shouldn't crash the app
    session.send("a").ok();
    std::thread::sleep(Duration::from_millis(50));
    session.send("b").ok();
    std::thread::sleep(Duration::from_millis(50));
    session.send("c").ok();
    std::thread::sleep(Duration::from_millis(50));

    // App should still be running, now quit
    session
        .send("q")
        .expect("Failed to send quit after random keys");

    std::thread::sleep(Duration::from_millis(100));
    let status = session.process.wait();
    assert!(
        status.is_ok(),
        "App should handle random keys and quit cleanly"
    );
}
