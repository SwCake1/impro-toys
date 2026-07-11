# Repository Guidelines

## Project Structure & Module Organization

This repository is a dependency-free static site for improvisation tools. Keep
the root `index.html` as the tool catalog. Place each tool in its own directory,
for example `tools/emotion/index.html`, with tool-specific logic and data beside
it (`app.js`, `emotions.json`). Put shared styles, navigation code, images, and
sounds under `shared/`. Architectural decisions belong in `docs/`; see
`docs/site-architecture.md` before changing the layout. Create directories only
when a tool needs them.

## Build, Test, and Development Commands

There is no build step or package manager.

## Responsive Compatibility

Every page and interaction must work in both desktop and mobile browsers.
