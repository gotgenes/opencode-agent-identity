# AGENTS Guide: opencode-agent-identity

## Project Overview

An npm package providing two [OpenCode](https://opencode.ai/) plugins that improve agent identity awareness in multi-agent sessions.
Small library: ~6 source files, ~350 lines including tests.

**Runtime:** Bun (development, building, testing) / Node.js (published target)
**Test framework:** Vitest
**Module format:** ESM (`"type": "module"`)

## Commands

| Command | Description |
| --- | --- |
| `bun run check` | TypeScript type checking |
| `bun run lint` | Biome linting + formatting + import sorting |
| `bun run lint:fix` | Auto-fix all Biome issues |
| `bun run lint:md` | Markdown linting |
| `bun run lint:all` | All lint checks (Biome + markdownlint) |
| `bun run format` | Format all files |
| `bun run test` | Run tests |
| `bun run build` | Build the package |

## Code Conventions

- **Formatting and linting:** Biome handles formatting, linting, and import sorting. Config in `biome.json`.
- **Import style:** Use `import type { X }` (not `import { type X }`). Biome enforces this.
- **Test files:** `noExplicitAny` and `noNonNullAssertion` are disabled in `*.test.ts` files because the OpenCode plugin SDK v1 types lack the `agent` field that exists at runtime. Tests use `as any` casts to work around this. See `src/types.ts` for context.
- **Pre-commit hooks:** Managed by [prek](https://prek.j178.dev/) (`prek.toml`). Run `prek install` after cloning.

## CI

- **PR CI** (`.github/workflows/ci.yml`): type check, lint, test — runs on PRs and pushes to main.
- **Release** (`.github/workflows/release-please.yml`): release-please + npm publish via OIDC trusted publishing — runs on push to main.

## Git Commit Messages

Conventional commits: `feat:`, `fix:`, `chore:`, etc.
