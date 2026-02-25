//! End-to-end tests for ralph-tui CLI
//!
//! These tests verify the binary works from a user perspective:
//! - Binary can be executed
//! - Binary outputs correct version information
//! - Binary exits successfully

use assert_cmd::cargo::cargo_bin_cmd;
use predicates::prelude::*;

#[test]
fn binary_runs_successfully() {
    let mut cmd = cargo_bin_cmd!("ralph-tui");
    cmd.assert().success();
}

#[test]
fn binary_outputs_version() {
    let mut cmd = cargo_bin_cmd!("ralph-tui");
    cmd.assert()
        .success()
        .stdout(predicate::str::contains("ralph-tui v"));
}

#[test]
fn binary_outputs_correct_version_format() {
    let mut cmd = cargo_bin_cmd!("ralph-tui");
    cmd.assert()
        .success()
        .stdout(predicate::str::contains("ralph-tui v0.1.0"));
}

#[test]
fn binary_produces_no_stderr() {
    let mut cmd = cargo_bin_cmd!("ralph-tui");
    cmd.assert()
        .success()
        .stderr(predicate::str::is_empty());
}
