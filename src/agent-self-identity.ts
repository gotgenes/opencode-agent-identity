import { type Plugin } from "@opencode-ai/plugin";
import type { MessageWithParts } from "./types";

// Addresses OpenCode #7492: agents lack self-identity awareness when the user
// switches agents mid-session. The model's system prompt contains no "you are
// the X agent" statement, so it infers its role only from tool availability.
//
// This plugin uses two hooks with shared, session-scoped state:
//   1. messages.transform (fires first) — reads the current agent name from the
//      last user message's info.agent field.
//   2. system.transform (fires second) — appends a one-liner identity statement
//      to the system prompt.
//
// State is keyed by sessionID so concurrent sessions don't interfere.

export const AgentSelfIdentityPlugin: Plugin = async () => {
  const agentBySession = new Map<string, string>();

  return {
    "experimental.chat.messages.transform": async (_input, output) => {
      const messages = output.messages as MessageWithParts[];
      const lastUserMsg = messages.findLast((m) => m.info.role === "user");
      if (!lastUserMsg?.info.agent) return;
      agentBySession.set(lastUserMsg.info.sessionID, lastUserMsg.info.agent);
    },

    "experimental.chat.system.transform": async (input, output) => {
      if (!input.sessionID) return;
      const agent = agentBySession.get(input.sessionID);
      if (!agent) return;
      output.system.push(
        `You are currently operating as the "${agent}" agent.`,
      );
      agentBySession.delete(input.sessionID);
    },
  };
};
