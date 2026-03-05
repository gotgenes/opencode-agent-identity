import type { Plugin } from "@opencode-ai/plugin";
import { tool } from "@opencode-ai/plugin/tool";

export const AgentAttributionToolPlugin: Plugin = async () => {
  return {
    tool: {
      agent_attribution: tool({
        description:
          "Get agent attribution for all messages in the current session. " +
          "Returns which agent authored each message, useful for " +
          "understanding multi-agent conversations.",
        args: {},
        async execute() {
          return "";
        },
      }),
    },
  };
};
