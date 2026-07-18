# Repository Guidelines

## Project Structure & Module Organization

This repository is a dependency-free static site for improvisation tools. Keep
the root `index.html` as the tool catalog. Place each tool in its own directory,
for example `tools/emotion/index.html`, with tool-specific logic and data beside
it (`app.js`, local data, images, and sounds). Put only site-wide styles and
catalog assets under `shared/`. Architectural decisions belong in `docs/`; see
`docs/site-architecture.md` before changing the layout. Accepted behavior
requirements live under `openspec/specs/`. Create directories only when a tool
needs them.

## Build, Test, and Development Commands

There is no build step or package manager. Open the root `index.html` directly
to check the site through `file://`. After changes, verify the affected catalog
and tool pages in a browser.

Run `bash -n deploy.sh` to validate the deployment script. Run `./deploy.sh`
from a clean, committed feature branch to update local `main`, merge the current
branch into it, push `origin/main`, and return to the original branch. Deployment
pushes remote changes, so run it only when publication is intended.

## Responsive Compatibility

Every page and interaction must work in both desktop and mobile browsers.
Support pointer, keyboard, and touch input where applicable. Keep internal links
and shared resource paths relative so the site works both through `file://` and
on GitHub Pages.
