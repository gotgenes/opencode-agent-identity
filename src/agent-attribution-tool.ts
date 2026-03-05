import type { Plugin } from "@opencode-ai/plugin";
import { tool } from "@opencode-ai/plugin";
import type { MessageWithAgent } from "./types";

export const AgentAttributionToolPlugin: Plugin = async ({ client }) => {
  return {
    tool: {
      agent_attribution: tool({
        description:
          "Get agent attribution for all messages in the current session. " +
          "Returns which agent authored each message, useful for " +
          "understanding multi-agent conversations.",
        args: {},
        async execute(_args, context) {
          const response = await client.session.messages({
            path: { id: context.sessionID },
          });
          const messages = response.data ?? [];
          if (messages.length === 0) return "";
          return messages
            .map((msg, i) => {
              const info = msg.info as Partial<MessageWithAgent>;
              const agent = info.agent ?? "unknown";
              const base = `${i + 1}. ${msg.info.role} (${agent})`;
              if (msg.info.role === "assistant") {
                return `${base} [${msg.info.providerID}/${msg.info.modelID}]`;
              }
              return base;
            })
            .join("\n");
        },
      }),
    },
  };
};
