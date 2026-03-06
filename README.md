# @gotgenes/opencode-agent-identity

[![npm version](https://img.shields.io/npm/v/@gotgenes/opencode-agent-identity?style=flat&logo=npm&logoColor=white)](https://www.npmjs.com/package/@gotgenes/opencode-agent-identity)
[![CI](https://img.shields.io/github/actions/workflow/status/gotgenes/opencode-agent-identity/ci.yml?style=flat&logo=github&label=CI)](https://github.com/gotgenes/opencode-agent-identity/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-%3E%3D1.0-f9f1e1?style=flat&logo=bun&logoColor=black)](https://bun.sh/)
[![OpenCode Plugin](https://img.shields.io/badge/OpenCode-Plugin-8B5CF6?style=flat)](https://opencode.ai/)

OpenCode plugins for agent self-identity and per-message agent attribution.

## What it does

This package provides two plugins that improve agent identity awareness in [OpenCode](https://opencode.ai/) sessions:

- **AgentSelfIdentityPlugin** — Injects a one-liner identity statement (e.g., `You are currently operating as the "build" agent.`) into the system prompt so the model knows which agent it's operating as.
  Addresses [OpenCode #7492](https://github.com/anomalyco/opencode/issues/7492).

- **AgentAttributionToolPlugin** — Exposes an `agent_attribution` tool that any agent can call to get per-message attribution for the current session. Returns which agent produced each assistant response and which model was used. Useful for agents that review multi-agent sessions, like a Retrospective agent.
  Addresses [OpenCode #14930](https://github.com/anomalyco/opencode/issues/14930).

## Installation

Add the plugin to your `opencode.json`:

```json
{
  "plugin": ["@gotgenes/opencode-agent-identity"]
}
```

Both plugins are loaded automatically when the package is installed.

## How it works

### Agent Self-Identity

When a user switches agents mid-session (e.g., Plan → Build → Plan), the newly active agent has no built-in way to know its own name.
This plugin uses two hooks with shared, session-scoped state:

1. `experimental.chat.messages.transform` — Reads the current agent name from the last user message's `info.agent` field.
2. `experimental.chat.system.transform` — Appends an identity statement to the system prompt.

State is keyed by session ID so concurrent sessions don't interfere.

### Agent Attribution Tool

All agents in a session share one flat conversation history, but `MessageV2.toModelMessages()` strips the `info.agent` metadata when converting to the format sent to the LLM.
This plugin exposes an `agent_attribution` tool that retrieves per-message attribution on demand via the OpenCode SDK.

When called, the tool returns a numbered list of every message in the session.
User messages show only the role; assistant messages include the agent name and the provider and model that produced the response:

```text
1. user
2. assistant (project-manager) [anthropic/claude-sonnet-4-6]
3. user
4. assistant (product-manager) [anthropic/claude-sonnet-4-6]
5. user
6. assistant (project-manager) [anthropic/claude-sonnet-4-6]
```

#### Why a tool instead of inline tags?

An earlier version of this package (v1) injected `[agent: X]` tags directly into assistant message text in the conversation history.
This caused two problems:

1. **Identity confusion**: When switching agents mid-session, the accumulated tags from the previous agent overwhelmed the system prompt identity, causing the model to identify as the wrong agent.
2. **Self-authoring**: Models learned the `[agent: X]` pattern and started generating the tags themselves, creating a feedback loop that reinforced the wrong identity.

The tool-based approach keeps the conversation history clean and lets agents query attribution only when they need it.

#### Integrating with your agents

To use the attribution tool, mention it in the agent's system prompt. For example, a Retrospective agent that reviews multi-agent sessions could include:

```markdown
## Multi-agent attribution

This session may involve multiple agents. To determine which agent produced
each response, call the `agent_attribution` tool. It returns a numbered list
of every message in the session. User messages show only the role; assistant
messages include the agent name and the provider and model that produced the
response.
```

## Upgrading

See [MIGRATION.md](MIGRATION.md) for upgrade guides between major versions.

## Development

### Prerequisites

- [Bun](https://bun.sh/) — runtime, package manager, and test runner
- [prek](https://prek.j178.dev/) — pre-commit hook framework (`brew install prek`)

### Setup

```sh
bun install
prek install
```

### Commands

| Command | Description |
| --- | --- |
| `bun run check` | TypeScript type checking |
| `bun run lint` | Biome linting + formatting check + import sorting |
| `bun run lint:fix` | Auto-fix all Biome issues |
| `bun run lint:md` | Markdown linting |
| `bun run lint:all` | All linting checks |
| `bun run format` | Format all files |
| `bun run test` | Run tests |
| `bun run test:watch` | Run tests in watch mode |
| `bun run build` | Build the package |

### Pre-commit hooks

After running `prek install`, the following checks run automatically before each commit:

- Trailing whitespace trimming
- End-of-file newline enforcement
- Large file detection
- Markdown linting
- Biome linting and formatting

## License

[MIT](LICENSE)
