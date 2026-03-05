import { describe, expect, it, vi } from "vitest";
import { AgentAttributionToolPlugin } from "./agent-attribution-tool";

function makeMessage(role: "user" | "assistant", agent: string) {
  return {
    info: { role, agent, id: `msg-${Math.random()}`, sessionID: "ses-1" },
    parts: [{ type: "text" as const, text: "some content" }],
  };
}

function mockClient(messages: ReturnType<typeof makeMessage>[]) {
  return {
    session: {
      messages: vi.fn().mockResolvedValue({ data: messages }),
    },
  };
}

describe("AgentAttributionToolPlugin", () => {
  it.skip("returns per-message agent attribution for a multi-agent session", async () => {
    const messages = [
      makeMessage("user", "project-manager"),
      makeMessage("assistant", "project-manager"),
      makeMessage("user", "product-manager"),
      makeMessage("assistant", "product-manager"),
      makeMessage("user", "project-manager"),
      makeMessage("assistant", "project-manager"),
    ];
    const client = mockClient(messages);
    const hooks = await AgentAttributionToolPlugin({ client } as any);

    const tool = hooks.tool!.agent_attribution;
    expect(tool).toBeDefined();

    const context = {
      sessionID: "ses-1",
      messageID: "msg-1",
      agent: "retrospective",
      directory: "/tmp",
      worktree: "/tmp",
      abort: new AbortController().signal,
      metadata: vi.fn(),
      ask: vi.fn(),
    };
    const result = await tool.execute({}, context);

    expect(client.session.messages).toHaveBeenCalledWith({
      path: { id: "ses-1" },
    });

    // Should contain per-message attribution lines
    expect(result).toContain("project-manager");
    expect(result).toContain("product-manager");

    // Each message should be represented
    const lines = result.trim().split("\n");
    expect(lines).toHaveLength(6);

    // Verify ordering and role/agent content
    expect(lines[0]).toContain("1.");
    expect(lines[0]).toContain("user");
    expect(lines[0]).toContain("project-manager");
    expect(lines[1]).toContain("2.");
    expect(lines[1]).toContain("assistant");
    expect(lines[1]).toContain("project-manager");
    expect(lines[2]).toContain("3.");
    expect(lines[2]).toContain("user");
    expect(lines[2]).toContain("product-manager");
    expect(lines[3]).toContain("4.");
    expect(lines[3]).toContain("assistant");
    expect(lines[3]).toContain("product-manager");
    expect(lines[4]).toContain("5.");
    expect(lines[4]).toContain("user");
    expect(lines[4]).toContain("project-manager");
    expect(lines[5]).toContain("6.");
    expect(lines[5]).toContain("assistant");
    expect(lines[5]).toContain("project-manager");
  });
});
