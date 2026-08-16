# Implementation Report: ArchAudit Standalone Runtime

**Spec:** `docs/superpowers/plans/2026-08-16-arch-audit-standalone-runtime-bug-fix.md`
**Date:** 2026-08-16
**Status:** completed

## What was done

- Added a deterministic esbuild release step and checked-in, platform-neutral `dist/` shared by Claude Code, Codex, and Cursor.
- Repointed all installed-plugin commands to the shipped Node.js runtime; installed copies no longer need `node_modules`, `tsx`, or a package installation step.
- Bundled the dependency-cruiser CLI, JSON reporter, Acorn, and TypeScript support required by the JavaScript/TypeScript ArchAudit adapter.
- Added a freshness gate and a clean-distribution regression that copies the plugin without any `node_modules`, exercises `dependency-cruiser --info`, audits TypeScript with path aliases and type syntax, renders Markdown, applies a rules patch, and regenerates the principles index.
- Replaced invalid package-install recovery advice with plugin-update guidance.
- Synchronized the marketplace, Claude Code, Codex, and Cursor manifests at hi_flow `0.15.2`; bumped the internal ArchAudit package to `0.3.2`.
- Updated vulnerable shipped dependencies to `fast-uri@3.1.5` and `js-yaml@4.3.1`; removed unused production dependency `tsx` and updated esbuild to `0.28.2`.

## Deviations from spec

- The dependency-cruiser distribution is a small multi-file runtime rather than one file because its reporter is selected by a relative dynamic import. Shipping `json.mjs` beside the CLI preserves upstream behavior without runtime package resolution.
- The bundle explicitly fixes the supported adapter boundary to JavaScript and TypeScript. Optional dependency-cruiser transpilers remain disabled instead of being discovered from the audited project, preserving runtime ownership and deterministic behavior.
- A compatibility shim rejects the unreachable enhanced-resolve pre-v4 branch; the bundled resolver is v5 and the clean TypeScript path-alias scenario verifies the active branch.

## Issues discovered

- The initial bundle left an external legacy enhanced-resolve import and dependency-cruiser's dynamic Acorn/TypeScript discovery paths. Both were caught before release and replaced with build-time-owned compatibility modules plus executable clean-copy coverage.
- The pre-existing `fast-uri` and `js-yaml` security debt became part of the shipped bundle. It was closed before release; `npm audit --omit=dev` reports zero vulnerabilities.
- A new ArchAudit run of this repository was skipped because the repair changes plugin packaging and generated runtime artifacts, not project source dependency boundaries or architecture rules. The full package suite and clean-distribution scenario are the relevant executable gates.

## Open items

- None.
