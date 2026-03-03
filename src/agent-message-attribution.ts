import { type Plugin } from "@opencode-ai/plugin";
import type { MessageWithParts } from "./types";

// Addresses OpenCode #14930: the conversation context sent to the model lacks
// per-message agent attribution. All agents in a session share one flat
// conversation history, but MessageV2.toModelMessages() strips the info.agent
// metadata. Downstream agents (e.g. Retrospective reviewing a full session)
// see a flat transcript with no way to tell which agent produced which response.
//
// This plugin prepends a small "[agent: X]" header to each assistant message's
// first text part before the messages reach the LLM. The mutation is ephemeral
// — it affects only what the model sees in this call, without altering what's
// persisted in the database.

export const AgentMessageAttributionPlugin: Plugin = async () => {
  return {
    "experimental.chat.messages.transform": async (_input, output) => {
      const messages = output.messages as MessageWithParts[];
      for (const msg of messages) {
        if (msg.info.role !== "assistant") continue;
        const agent = msg.info.agent;
        if (!agent) continue;
        const textPart = msg.parts.find((p) => p.type === "text");
        if (!textPart || textPart.type !== "text") continue;
        if (textPart.text.startsWith("[agent:")) continue;
        textPart.text = `[agent: ${agent}]\n${textPart.text}`;
      }
    },
  };
};
