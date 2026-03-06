# Migration Guide

## Migrating from v2 to v3

### agent_attribution tool output format changed

User messages in `agent_attribution` tool output no longer include an agent
annotation. The `agent` field on user messages reflects which agent the message
was *routed to*, not which agent *processed* it — this is misleading when
commands like `/retro` switch the processing agent mid-turn.

**Before (v2):**

```text
1. user (project-manager)
2. assistant (project-manager) [anthropic/claude-sonnet-4-6]
3. user (project-manager)
4. assistant (retrospective) [anthropic/claude-sonnet-4-6]
```

**After (v3):**

```text
1. user
2. assistant (project-manager) [anthropic/claude-sonnet-4-6]
3. user
4. assistant (retrospective) [anthropic/claude-sonnet-4-6]
```

Agent and model attribution remains on assistant messages, where it accurately
reflects which agent produced the response.

If your agent system prompts describe the `agent_attribution` output format
explicitly (e.g., "user messages include `(agent-name)` in parentheses"), update
those descriptions to match the new format.

### Note on v2.1.0

v2.1.0 also changed the `agent_attribution` output format by appending
`[provider/model]` to assistant message lines (e.g.,
`2. assistant (build) [anthropic/claude-sonnet-4-6]`). This was released as a
minor version but was a breaking change for any consumer parsing the output
format literally. If you are upgrading from v2.0.x, account for both changes.

## Migrating from v1 to v2

v2 removes `AgentMessageAttributionPlugin` and replaces it with
`AgentAttributionToolPlugin`.

If you were importing `AgentMessageAttributionPlugin` directly, replace it:

```diff
- import { AgentMessageAttributionPlugin } from "@gotgenes/opencode-agent-identity";
+ import { AgentAttributionToolPlugin } from "@gotgenes/opencode-agent-identity";
```

If you rely on the automatic plugin loading via `opencode.json` (the typical
setup), no code changes are needed — just update the package version.

### Why the change?

The v1 approach injected `[agent: X]` tags directly into assistant message text
in the conversation history. This caused two problems:

1. **Identity confusion**: When switching agents mid-session, the accumulated
   tags from the previous agent overwhelmed the system prompt identity, causing
   the model to identify as the wrong agent.
2. **Self-authoring**: Models learned the `[agent: X]` pattern and started
   generating the tags themselves, creating a feedback loop that reinforced the
   wrong identity.

The tool-based approach in v2 keeps the conversation history clean and lets
agents query attribution only when they need it.
