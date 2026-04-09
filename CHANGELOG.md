# Changelog

All notable changes to this project are documented in this file.

## [1.1.0] - 2026-04-09

### Added
- Added `post` schema in `schemaTypes/post.js`.
- Registered `postType` in `schemaTypes/index.js`.

### Changed
- Updated Studio deployment slug to `pododesk-blog` in `sanity.config.js`.
- Added `deployment.appId` in `sanity.cli.js` to avoid interactive deploy prompts.
- Updated deploy script to target `pododesk-blog.sanity.studio` non-interactively.
- Replaced default README with project-specific operational documentation.

### Ops
- Verified Supabase migrations in repository `clinpe-app`: local and remote are fully synced up to `20260330000039_add_subscription_period.sql`.
