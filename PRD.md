# Tic-Tac-Toe (Jogo da Velha)

**Author:** user
**Updated:** 2026.02.25

## The Problem

People want to play tic-tac-toe either alone against an AI opponent or with friends on different devices, without needing to install applications, rely on servers, or manage complex setups.

## Target Use Cases

- As a user, I want to play tic-tac-toe against an AI opponent so I can practice when alone
- As a user, I want to play against another person on a different device so I can compete with friends remotely
- As a user, I want to see my win/loss record so I can track my performance over time
- As a user, I want smooth animations so the game feels polished and engaging
- As a user, I want to share a link to connect with another player so we can start a game easily
- As a user, I want marks to automatically disappear after 7 moves so the game has a dynamic, challenging twist

## Proposed Solution

A single HTML file with embedded CSS and JavaScript using native WebRTC APIs for peer-to-peer multiplayer, requiring no external dependencies, servers, or build tools.

## Goals

- Users can start playing within 5 seconds of opening the file
- AI provides challenging gameplay by blocking opponent wins and seizing winning opportunities
- Multiplayer connection works without server infrastructure (fully peer-to-peer)
- Score persists across browser sessions using localStorage
- Animations enhance user experience without blocking or slowing gameplay

## Out-of-Scope

- Hard/unbeatable AI difficulty (expert mode)
- Game replay or move history viewing
- User accounts or authentication
- Mobile native applications
- Server-based matchmaking or lobbies
- Tournament brackets or leaderboards
- Custom board sizes (only 3x3 supported)

## Requirements

### [P0] Project Foundation
- [x] Create single HTML file structure with embedded CSS and JavaScript sections
- [x] Set up localStorage integration for score persistence
- [x] Implement basic 3x3 game board rendering with DOM manipulation
- [x] Add core game state management (turn tracking, win detection, draw detection)

### [P1] Single Player vs AI
- [x] Implement medium-difficulty AI that blocks opponent winning moves
- [x] AI takes winning opportunities when available
- [x] AI makes reasonable strategic moves when no immediate threats or opportunities exist
- [x] Player can choose to be X or O before starting

### [P2] Score Tracking
- [x] Track wins, losses, and draws separately for single-player and multiplayer modes
- [x] Display current score on screen with clear labels
- [x] Persist scores to localStorage and restore on page load
- [x] Add button to reset all scores

### [P3] Animations
- [x] Animate cell marks (X/O) appearing with CSS transitions when placed
- [x] Highlight winning line with visual animation effect
- [x] Add smooth transitions for game state changes (new game, reset board)
- [x] Animate score counter updates

### [P4] Peer-to-Peer Multiplayer
- [x] Implement WebRTC data channel for direct peer-to-peer connection
- [x] Generate connection offer/answer codes for manual signaling exchange
- [x] Provide UI for users to copy/paste connection data to establish link
- [x] Synchronize all game state changes between connected peers
- [x] Handle peer disconnections gracefully with appropriate user feedback

### [P5] Disappearing Marks Mechanic
- [x] Track move history to identify the globally oldest mark after 7 total moves
- [x] Automatically remove the oldest mark (regardless of player) when the 8th move is placed
- [x] Implement gradual fade-out animation for marks about to disappear
- [x] Update win detection to work correctly with dynamic board state
- [x] Enable mechanic across all game modes (vs AI, Local, and Online)
- [x] Synchronize mark disappearance across WebRTC peers in online mode
- [x] Add visual indicator showing which mark will disappear next using reduced opacity
