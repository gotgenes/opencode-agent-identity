// The plugin hook types import Message from @opencode-ai/sdk (v1), which
// lacks the `agent` field that was added in v2. The runtime data does include
// `agent` on both UserMessage and AssistantMessage, but the v1 type
// definitions don't reflect this.
//
// These helpers provide type-safe access to the agent field until the plugin
// SDK is updated to use the v2 types.

import type { Message, Part } from "@opencode-ai/sdk";

export type MessageWithAgent = Message & { agent: string };

export type MessageWithParts = {
  info: MessageWithAgent;
  parts: Part[];
};
