import type { Plugin } from "@opencode-ai/plugin";
import { tool } from "@opencode-ai/plugin";
import type { MessageWithAgent } from "./types";

export const AgentAttributionToolPlugin: Plugin = async ({ client }) => {
  return {
    tool: {
      agent_attribution: tool({
        description:
          "Get agent attribution for all messages in the current session. " +
          "Returns which agent produced each assistant response and which " +
          "model was used, useful for understanding multi-agent conversations.",
        args: {},
        async execute(_args, context) {
          const response = await client.session.messages({
            path: { id: context.sessionID },
          });
          const messages = response.data ?? [];
          if (messages.length === 0) return "";
          return messages
            .map((msg, i) => {
              const line = `${i + 1}. ${msg.info.role}`;
              if (msg.info.role === "assistant") {
                const info = msg.info as Partial<MessageWithAgent>;
                const agent = info.agent ?? "unknown";
                return `${line} (${agent}) [${msg.info.providerID}/${msg.info.modelID}]`;
              }
              return line;
            })
            .join("\n");
        },
      }),
    },
  };
};
