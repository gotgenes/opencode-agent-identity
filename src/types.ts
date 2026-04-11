// The plugin hook types import Message from @opencode-ai/sdk (v1), which
// lacks some fields present in v2. The runtime data includes these fields,
// but the v1 type definitions don't reflect them yet.
//
// - `agent` exists on UserMessage (v1) but not AssistantMessage (v1)
// - `variant` (the specific model variant/snapshot) exists on both message
//   types in v2 but neither in v1
//
// These helpers provide type-safe access until the plugin SDK uses v2 types.
// See: https://github.com/anomalyco/opencode/issues/15916

import type { Message, Part } from "@opencode-ai/sdk";

export type MessageWithAgent = Message & { agent: string };

export type AssistantMessageInfo = MessageWithAgent & {
  role: "assistant";
  providerID: string;
  modelID: string;
  variant?: string;
};

export type MessageWithParts = {
  info: MessageWithAgent;
  parts: Part[];
};
