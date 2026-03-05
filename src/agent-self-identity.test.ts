import { describe, expect, it } from "bun:test";
import { AgentSelfIdentityPlugin } from "./agent-self-identity";
import type { MessageWithParts } from "./types";

function userMsg(agent: string, sessionID: string): MessageWithParts {
  return {
    info: { role: "user", agent, sessionID, id: "u1" } as any,
    parts: [],
  };
}

function assistantMsg(agent: string, sessionID: string): MessageWithParts {
  return {
    info: { role: "assistant", agent, sessionID, id: "a1" } as any,
    parts: [{ type: "text" as const, text: "Hello" } as any],
  };
}

describe("AgentSelfIdentityPlugin", () => {
  it("injects the agent name into the system prompt", async () => {
    const hooks = await AgentSelfIdentityPlugin({} as any);

    const messages = [
      userMsg("build", "session-1"),
      assistantMsg("build", "session-1"),
      userMsg("build", "session-1"),
    ];
    const messagesOutput = { messages } as any;
    await hooks["experimental.chat.messages.transform"]!({}, messagesOutput);

    const systemOutput = { system: ["You are a helpful assistant."] };
    await hooks["experimental.chat.system.transform"]!(
      { sessionID: "session-1", model: {} as any },
      systemOutput,
    );

    expect(systemOutput.system).toContain(
      'You are currently operating as the "build" agent.',
    );
  });

  it("cleans up state after system.transform", async () => {
    const hooks = await AgentSelfIdentityPlugin({} as any);

    const messagesOutput = { messages: [userMsg("plan", "session-2")] } as any;
    await hooks["experimental.chat.messages.transform"]!({}, messagesOutput);
    await hooks["experimental.chat.system.transform"]!(
      { sessionID: "session-2", model: {} as any },
      { system: [] },
    );

    // Second call without messages.transform should not inject
    const systemOutput = { system: [] as string[] };
    await hooks["experimental.chat.system.transform"]!(
      { sessionID: "session-2", model: {} as any },
      systemOutput,
    );

    expect(systemOutput.system).toEqual([]);
  });

  it("does nothing when there are no user messages", async () => {
    const hooks = await AgentSelfIdentityPlugin({} as any);

    const messagesOutput = {
      messages: [assistantMsg("build", "session-3")],
    } as any;
    await hooks["experimental.chat.messages.transform"]!({}, messagesOutput);

    const systemOutput = { system: [] as string[] };
    await hooks["experimental.chat.system.transform"]!(
      { sessionID: "session-3", model: {} as any },
      systemOutput,
    );

    expect(systemOutput.system).toEqual([]);
  });

  it("does nothing when sessionID is undefined", async () => {
    const hooks = await AgentSelfIdentityPlugin({} as any);

    const messagesOutput = { messages: [userMsg("build", "session-4")] } as any;
    await hooks["experimental.chat.messages.transform"]!({}, messagesOutput);

    const systemOutput = { system: [] as string[] };
    await hooks["experimental.chat.system.transform"]!(
      { sessionID: undefined, model: {} as any },
      systemOutput,
    );

    expect(systemOutput.system).toEqual([]);
  });

  it("handles concurrent sessions without interference", async () => {
    const hooks = await AgentSelfIdentityPlugin({} as any);

    // Session A: build agent
    await hooks["experimental.chat.messages.transform"]!({}, {
      messages: [userMsg("build", "session-a")],
    } as any);

    // Session B: plan agent
    await hooks["experimental.chat.messages.transform"]!({}, {
      messages: [userMsg("plan", "session-b")],
    } as any);

    // Session A system.transform should get "build"
    const systemA = { system: [] as string[] };
    await hooks["experimental.chat.system.transform"]!(
      { sessionID: "session-a", model: {} as any },
      systemA,
    );
    expect(systemA.system).toContain(
      'You are currently operating as the "build" agent.',
    );

    // Session B system.transform should get "plan"
    const systemB = { system: [] as string[] };
    await hooks["experimental.chat.system.transform"]!(
      { sessionID: "session-b", model: {} as any },
      systemB,
    );
    expect(systemB.system).toContain(
      'You are currently operating as the "plan" agent.',
    );
  });

  it("uses the last user message agent when multiple exist", async () => {
    const hooks = await AgentSelfIdentityPlugin({} as any);

    const messages = [
      userMsg("plan", "session-5"),
      assistantMsg("plan", "session-5"),
      userMsg("build", "session-5"),
    ];
    await hooks["experimental.chat.messages.transform"]!({}, {
      messages,
    } as any);

    const systemOutput = { system: [] as string[] };
    await hooks["experimental.chat.system.transform"]!(
      { sessionID: "session-5", model: {} as any },
      systemOutput,
    );

    expect(systemOutput.system).toContain(
      'You are currently operating as the "build" agent.',
    );
  });

  it("identifies as the command-triggered agent, not the previously active agent", async () => {
    // Scenario: user has been working with "plan" for several turns, then
    // invokes a slash command (e.g. /retro) that switches to a different agent.
    // OpenCode sets info.agent on the command's user message to the
    // command-triggered agent. The system prompt should reflect that agent,
    // not the one that dominated the conversation history.
    const hooks = await AgentSelfIdentityPlugin({} as any);

    const messages = [
      userMsg("plan", "session-6"),
      assistantMsg("plan", "session-6"),
      userMsg("plan", "session-6"),
      assistantMsg("plan", "session-6"),
      userMsg("plan", "session-6"),
      assistantMsg("plan", "session-6"),
      userMsg("retrospective", "session-6"), // /retro command
    ];
    await hooks["experimental.chat.messages.transform"]!({}, {
      messages,
    } as any);

    const systemOutput = { system: [] as string[] };
    await hooks["experimental.chat.system.transform"]!(
      { sessionID: "session-6", model: {} as any },
      systemOutput,
    );

    expect(systemOutput.system).toContain(
      'You are currently operating as the "retrospective" agent.',
    );
  });
});
