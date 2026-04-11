import { describe, expect, it, jest } from "bun:test";
import { AgentAttributionToolPlugin } from "./agent-attribution-tool";

function makeMessage(role: "user" | "assistant", agent: string) {
  return {
    info: { role, agent, id: `msg-${Math.random()}`, sessionID: "ses-1" },
    parts: [{ type: "text" as const, text: "some content" }],
  };
}

function makeAssistantMessage(
  agent: string,
  providerID: string,
  modelID: string,
  variant?: string,
) {
  return {
    info: {
      role: "assistant" as const,
      agent,
      providerID,
      modelID,
      ...(variant !== undefined && { variant }),
      id: `msg-${Math.random()}`,
      sessionID: "ses-1",
    },
    parts: [{ type: "text" as const, text: "some content" }],
  };
}

function mockClient(messages: ReturnType<typeof makeMessage>[]) {
  return {
    session: {
      messages: jest.fn().mockResolvedValue({ data: messages }),
    },
  };
}

function toolContext(sessionID = "ses-1") {
  return {
    sessionID,
    messageID: "msg-1",
    agent: "retrospective",
    directory: "/tmp",
    worktree: "/tmp",
    abort: new AbortController().signal,
    metadata: jest.fn(),
    ask: jest.fn(),
  };
}

async function setupTool(messages: ReturnType<typeof makeMessage>[]) {
  const client = mockClient(messages);
  const hooks = await AgentAttributionToolPlugin({ client } as any);
  const tool = hooks.tool!.agent_attribution;
  return { client, hooks, tool };
}

describe("AgentAttributionToolPlugin", () => {
  it("exposes an agent_attribution tool", async () => {
    const { hooks } = await setupTool([]);

    expect(hooks.tool).toBeDefined();
    expect(hooks.tool!.agent_attribution).toBeDefined();
    expect(hooks.tool!.agent_attribution.description).toEqual(
      expect.any(String),
    );
  });

  it("returns empty string for a session with no messages", async () => {
    const { client, tool } = await setupTool([]);
    const result = await tool.execute({}, toolContext());

    expect(client.session.messages).toHaveBeenCalledWith({
      path: { id: "ses-1" },
    });
    expect(result).toBe("");
  });

  it("formats a single user message with index and role", async () => {
    const { tool } = await setupTool([makeMessage("user", "build")]);
    const result = await tool.execute({}, toolContext());

    expect(result).toBe("1. user");
  });

  it("returns per-message agent attribution for a multi-agent session", async () => {
    const model = { providerID: "anthropic", modelID: "claude-sonnet-4-6" };
    const { client, tool } = await setupTool([
      makeMessage("user", "project-manager"),
      makeAssistantMessage("project-manager", model.providerID, model.modelID),
      makeMessage("user", "product-manager"),
      makeAssistantMessage("product-manager", model.providerID, model.modelID),
      makeMessage("user", "project-manager"),
      makeAssistantMessage("project-manager", model.providerID, model.modelID),
    ]);

    const result = await tool.execute({}, toolContext());

    expect(client.session.messages).toHaveBeenCalledWith({
      path: { id: "ses-1" },
    });

    const lines = result.trim().split("\n");
    expect(lines).toEqual([
      "1. user",
      "2. assistant (project-manager) [anthropic/claude-sonnet-4-6]",
      "3. user",
      "4. assistant (product-manager) [anthropic/claude-sonnet-4-6]",
      "5. user",
      "6. assistant (project-manager) [anthropic/claude-sonnet-4-6]",
    ]);
  });

  it("handles messages without an agent field", async () => {
    const msgNoAgent = {
      info: {
        role: "assistant" as const,
        id: "a1",
        sessionID: "ses-1",
        providerID: "anthropic",
        modelID: "claude-sonnet-4-6",
      },
      parts: [{ type: "text" as const, text: "hello" }],
    };
    const { tool } = await setupTool([
      makeMessage("user", "build"),
      msgNoAgent as any,
    ]);
    const result = await tool.execute({}, toolContext());
    const lines = result.trim().split("\n");

    expect(lines[0]).toBe("1. user");
    expect(lines[1]).toBe(
      "2. assistant (unknown) [anthropic/claude-sonnet-4-6]",
    );
  });

  it("includes model on assistant messages in a multi-model session", async () => {
    const { tool } = await setupTool([
      makeMessage("user", "build"),
      makeAssistantMessage("build", "anthropic", "claude-opus-4-6"),
      makeMessage("user", "retrospective"),
      makeAssistantMessage("retrospective", "anthropic", "claude-sonnet-4-6"),
    ]);
    const result = await tool.execute({}, toolContext());
    const lines = result.trim().split("\n");

    expect(lines).toEqual([
      "1. user",
      "2. assistant (build) [anthropic/claude-opus-4-6]",
      "3. user",
      "4. assistant (retrospective) [anthropic/claude-sonnet-4-6]",
    ]);
  });

  it("includes model variant in assistant message header when present", async () => {
    const { tool } = await setupTool([
      makeMessage("user", "build"),
      makeAssistantMessage("build", "anthropic", "claude-opus-4", "high"),
      makeMessage("user", "retrospective"),
      makeAssistantMessage("retrospective", "anthropic", "claude-sonnet-4-6"),
    ]);
    const result = await tool.execute({}, toolContext());
    const lines = result.trim().split("\n");

    expect(lines).toEqual([
      "1. user",
      "2. assistant (build) [anthropic/claude-opus-4 (high)]",
      "3. user",
      "4. assistant (retrospective) [anthropic/claude-sonnet-4-6]",
    ]);
  });

  it("omits agent annotation from user messages, shows it only on assistant messages", async () => {
    const { tool } = await setupTool([
      makeMessage("user", "project-manager"),
      makeAssistantMessage("project-manager", "anthropic", "claude-sonnet-4-6"),
      makeMessage("user", "project-manager"),
      makeAssistantMessage("retrospective", "anthropic", "claude-sonnet-4-6"),
    ]);
    const result = await tool.execute({}, toolContext());
    const lines = result.trim().split("\n");

    expect(lines).toEqual([
      "1. user",
      "2. assistant (project-manager) [anthropic/claude-sonnet-4-6]",
      "3. user",
      "4. assistant (retrospective) [anthropic/claude-sonnet-4-6]",
    ]);
  });
});
