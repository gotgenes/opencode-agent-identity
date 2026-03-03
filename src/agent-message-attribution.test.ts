import { describe, expect, it } from "vitest";
import { AgentMessageAttributionPlugin } from "./agent-message-attribution";
import type { MessageWithParts } from "./types";

function userMsg(agent: string): MessageWithParts {
  return {
    info: { role: "user", agent, sessionID: "s1", id: "u1" } as any,
    parts: [{ type: "text" as const, text: "Hello" } as any],
  };
}

function assistantMsg(agent: string, text: string): MessageWithParts {
  return {
    info: { role: "assistant", agent, sessionID: "s1", id: "a1" } as any,
    parts: [{ type: "text" as const, text } as any],
  };
}

describe("AgentMessageAttributionPlugin", () => {
  it("prepends [agent: X] to assistant messages", async () => {
    const hooks = await AgentMessageAttributionPlugin({} as any);

    const messages = [
      userMsg("build"),
      assistantMsg("build", "Here is the code."),
    ];
    const output = { messages } as any;
    await hooks["experimental.chat.messages.transform"]!({}, output);

    const assistantText = output.messages[1].parts[0];
    expect(assistantText.type).toBe("text");
    expect(assistantText.text).toBe("[agent: build]\nHere is the code.");
  });

  it("does not modify user messages", async () => {
    const hooks = await AgentMessageAttributionPlugin({} as any);

    const messages = [userMsg("build")];
    const output = { messages } as any;
    await hooks["experimental.chat.messages.transform"]!({}, output);

    const userText = output.messages[0].parts[0];
    expect(userText.type).toBe("text");
    expect(userText.text).toBe("Hello");
  });

  it("skips assistant messages already prefixed with [agent:", async () => {
    const hooks = await AgentMessageAttributionPlugin({} as any);

    const messages = [
      assistantMsg("build", "[agent: build]\nAlready attributed."),
    ];
    const output = { messages } as any;
    await hooks["experimental.chat.messages.transform"]!({}, output);

    expect(output.messages[0].parts[0].text).toBe(
      "[agent: build]\nAlready attributed.",
    );
  });

  it("skips assistant messages without a text part", async () => {
    const hooks = await AgentMessageAttributionPlugin({} as any);

    const messages: MessageWithParts[] = [
      {
        info: {
          role: "assistant",
          agent: "build",
          sessionID: "s1",
          id: "a1",
        } as any,
        parts: [{ type: "tool", id: "t1" } as any],
      },
    ];
    const output = { messages } as any;
    await hooks["experimental.chat.messages.transform"]!({}, output);

    // Should not throw, and tool part should remain unchanged
    expect(output.messages[0].parts[0].type).toBe("tool");
  });

  it("skips assistant messages without an agent field", async () => {
    const hooks = await AgentMessageAttributionPlugin({} as any);

    const messages = [assistantMsg("", "No agent.")];
    const output = { messages } as any;
    await hooks["experimental.chat.messages.transform"]!({}, output);

    expect(output.messages[0].parts[0].text).toBe("No agent.");
  });

  it("attributes messages from different agents correctly", async () => {
    const hooks = await AgentMessageAttributionPlugin({} as any);

    const messages = [
      userMsg("plan"),
      assistantMsg("plan", "Analysis complete."),
      userMsg("build"),
      assistantMsg("build", "Code written."),
    ];
    const output = { messages } as any;
    await hooks["experimental.chat.messages.transform"]!({}, output);

    expect(output.messages[1].parts[0].text).toBe(
      "[agent: plan]\nAnalysis complete.",
    );
    expect(output.messages[3].parts[0].text).toBe(
      "[agent: build]\nCode written.",
    );
  });
});
