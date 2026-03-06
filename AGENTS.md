# AGENTS Guide: opencode-agent-identity

## Project Overview

An npm package providing two [OpenCode](https://opencode.ai/) plugins that improve agent identity awareness in multi-agent sessions:
one injects agent identity into the system prompt, the other exposes a tool for querying per-message agent attribution via the SDK.
Small library — a handful of source files.

**Runtime:** Bun (development, building, testing) / Node.js (published target)
**Test framework:** Bun's built-in test runner (`bun test`)
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
- **Test files:** `noExplicitAny` and `noNonNullAssertion` are disabled in `*.test.ts` files. Tests use `as any` casts for two reasons: the SDK v1 types lack the `agent` field that exists at runtime (see `src/types.ts`), and plugin tests pass partial mocks for `PluginInput` and `ToolContext`.
- **Pre-commit hooks:** Managed by [prek](https://prek.j178.dev/) (`prek.toml`). Run `prek install` after cloning.
- **Dependency versions:** Use caret (`^`) ranges in `package.json`. The `bun.lock` lockfile ensures reproducible installs; exact pins are redundant.

## Architecture

The package exports two independent OpenCode plugins from `src/index.ts`:

| Plugin | File | Mechanism | Purpose |
| --- | --- | --- | --- |
| `AgentSelfIdentityPlugin` | `src/agent-self-identity.ts` | Two hooks with session-scoped shared state | Injects `You are currently operating as the "X" agent.` into the system prompt so models know which agent they are |
| `AgentAttributionToolPlugin` | `src/agent-attribution-tool.ts` | Tool registration via `tool()` | Exposes an `agent_attribution` tool that returns a numbered list of all messages in the session with their agent and model |

**AgentSelfIdentityPlugin** uses a two-phase hook pattern:

1. `messages.transform` (fires first) — reads the agent name from the last user message's `info.agent` field and stores it in a `Map<sessionID, agentName>`.
2. `system.transform` (fires second) — looks up the agent name by session ID, appends the identity line, and deletes the Map entry (one-shot per turn).

State is keyed by session ID so concurrent sessions don't interfere.

**AgentAttributionToolPlugin** calls `client.session.messages()` via the OpenCode SDK to fetch all messages, then formats them with role, agent name, and provider/model for assistant messages.

Shared types live in `src/types.ts` — see [SDK Type Gap](#sdk-type-gap) below.

## Build Pipeline

The build has two steps (both run by `bun run build`):

1. `bun build src/index.ts --outdir dist --target node --format esm` — bundles the source into a single `dist/index.js`.
2. `tsc --project tsconfig.build.json` — emits `.d.ts` declaration files to `dist/`.

`tsconfig.json` is for development (`noEmit`, `bun-types` included).
`tsconfig.build.json` extends it, overrides to `emitDeclarationOnly`, and excludes test files.

The package publishes only the `dist/` directory (per the `files` field in `package.json`).
Single entry point: `dist/index.js` (code) + `dist/index.d.ts` (types).

## Testing Patterns

Tests use Bun's built-in test runner.
Run a single test file with `bun test src/agent-self-identity.test.ts`.

Both test files use partial mocks — they construct minimal objects that satisfy only the fields the plugin actually reads, cast with `as any` to bypass the full type contracts:

- **Self-identity tests** pass hand-crafted message arrays to the hook functions directly, simulating the `messages.transform` → `system.transform` lifecycle.
- **Attribution tests** mock the SDK `client` by providing a `client.session.messages()` function that returns canned responses.
  The `context` object is a partial mock with just `sessionID`.

When writing new tests, follow these patterns rather than attempting to construct fully-typed `PluginInput` or `ToolContext` objects.

## SDK Type Gap

The OpenCode plugin SDK (`@opencode-ai/plugin` v1) re-exports types from `@opencode-ai/sdk` v1, which lacks the `agent` field on `Message`.
The field exists at runtime (added in SDK v2) but is missing from the v1 type definitions.

`src/types.ts` defines `MessageWithAgent` and `MessageWithParts` as type augmentations to bridge this gap.
Both plugins cast messages to these types to access `info.agent`.

Upstream issue: [opencode#15916](https://github.com/anomalyco/opencode/issues/15916).
When the plugin SDK updates to use v2 types, these augmentations and the associated `as` casts can be removed.

## CI

- **PR CI** (`.github/workflows/ci.yml`): type check, lint, test — runs on PRs and pushes to main.
- **Release** (`.github/workflows/release-please.yml`): release-please (manifest mode) + npm publish via OIDC trusted publishing — runs on push to main.

### Release-please configuration

Release-please runs in **manifest mode** — the workflow references `release-please-config.json` (config) and `.release-please-manifest.json` (version tracking).
Do not pass `release-type` as a workflow action input; it bypasses the config file.

The README ships on npm, so documentation changes are releasable.
`changelog-sections` in `release-please-config.json` controls which conventional commit types trigger a release: `feat`, `fix`, `perf`, `revert`, `docs`, and `chore` are visible; others (`style`, `refactor`, `test`, `build`, `ci`) are hidden.

## Development Workflow

Use the TDD agent (`/tdd`) for production code changes.
Use the Build agent (`/build`) for non-TDD tasks: configuration, CI, documentation, infrastructure.

## Git Commit Messages

Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, etc.
See [Release-please configuration](#release-please-configuration) for which types trigger releases.
