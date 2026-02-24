# Tic-Tac-Toe (Jogo da Velha)

**Author:** user
**Updated:** 2026.02.24

## The Problem

People want to play tic-tac-toe either alone against an AI opponent or with friends on different devices, without needing to install applications, rely on servers, or manage complex setups.

## Target Use Cases

- As a user, I want to play tic-tac-toe against an AI opponent so I can practice when alone
- As a user, I want to play against another person on a different device so I can compete with friends remotely
- As a user, I want to see my win/loss record so I can track my performance over time
- As a user, I want smooth animations so the game feels polished and engaging
- As a user, I want to share a link to connect with another player so we can start a game easily

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
- [ ] Track wins, losses, and draws separately for single-player and multiplayer modes
- [ ] Display current score on screen with clear labels
- [ ] Persist scores to localStorage and restore on page load
- [ ] Add button to reset all scores

### [P3] Animations
- [ ] Animate cell marks (X/O) appearing with CSS transitions when placed
- [ ] Highlight winning line with visual animation effect
- [ ] Add smooth transitions for game state changes (new game, reset board)
- [ ] Animate score counter updates

### [P4] Peer-to-Peer Multiplayer
- [ ] Implement WebRTC data channel for direct peer-to-peer connection
- [ ] Generate connection offer/answer codes for manual signaling exchange
- [ ] Provide UI for users to copy/paste connection data to establish link
- [ ] Synchronize all game state changes between connected peers
- [ ] Handle peer disconnections gracefully with appropriate user feedback
