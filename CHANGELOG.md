# Changelog

## [1.1.0] - 2026-01-16

### Fixed
- Fixed navigation bug where `history.back()` would stay on the blocked page if there was no browser history; now closes the tab instead
- Fixed timer refresh exploit: timer state is now persisted to storage, preventing users from resetting the countdown by refreshing
- Fixed challenge refresh exploit: challenge text and author are now persisted, preventing users from getting a new quote by refreshing

### Changed
- Timer now uses absolute end time instead of countdown, ensuring accurate time tracking across page reloads
- Challenge state is cleared on successful completion or timeout

## [1.0.0] - Initial Release

### Added
- Block distracting websites with a typing challenge
- Configurable blocked sites list
- Configurable max retries and block duration
- Motivational quotes as typing challenges
- Real-time typing feedback with accuracy stats
- Temporary lockout after too many failed attempts
