# @gotgenes/opencode-agent-identity

OpenCode plugins for agent self-identity and per-message agent attribution.

## What it does

This package provides two plugins that improve agent identity awareness in [OpenCode](https://opencode.ai/) sessions:

- **AgentSelfIdentityPlugin** — Injects a one-liner identity statement (e.g., `You are currently operating as the "build" agent.`) into the system prompt so the model knows which agent it's operating as.
  Addresses [OpenCode #7492](https://github.com/anomalyco/opencode/issues/7492).

- **AgentMessageAttributionPlugin** — Prepends `[agent: X]` headers to each assistant message's text content before it reaches the LLM, so downstream agents (e.g., a Retrospective agent reviewing a full session) can identify which agent produced which response.
  Addresses [OpenCode #14930](https://github.com/anomalyco/opencode/issues/14930).

Both mutations are ephemeral — they affect only what the model sees in each call, without altering what's persisted in the database.

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

### Agent Message Attribution

All agents in a session share one flat conversation history, but `MessageV2.toModelMessages()` strips the `info.agent` metadata when converting to the format sent to the LLM.
This plugin uses the `experimental.chat.messages.transform` hook to prepend a `[agent: X]` header to each assistant message's first text part.

## License

[MIT](LICENSE)
