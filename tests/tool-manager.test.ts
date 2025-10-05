import { describe, expect, it } from "vitest";
import type { McpDescriptor, McpTool, ResolvedDescriptor } from "../src/types";
import { ToolManager } from "../src/managers/tool-manager";
import { PermissionsManagerImpl } from "../src/managers/permissions-manager";
import { AuditManagerImpl } from "../src/managers/audit-manager";
import { SchemaValidationError, ConsentRejectedError } from "../src/utils/errors";

class FixedClock {
  private readonly date = new Date("2025-01-01T00:00:00Z");
  now() {
    return this.date;
  }
}

describe("ToolManager", () => {
  const baseTool: McpTool = {
    name: "search",
    description: "Search the page",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string", minLength: 1 } },
      required: ["query"],
    },
    outputSchema: {
      type: "object",
      properties: { success: { type: "boolean" } },
    },
    sideEffects: "local",
  };

  const descriptor: ResolvedDescriptor = {
    descriptor: {
      version: "2025-06-18",
      api: "1.0.0",
      tools: [{ ...baseTool }],
      permissions: { consent: true, sideEffects: "local" },
    },
    source: "inline",
  };

  const permissions = new PermissionsManagerImpl();

  const makeManager = (toolOverrides?: Partial<McpTool>, consent = true) => {
    const tool: McpTool = { ...baseTool, ...toolOverrides };
    const resolved: ResolvedDescriptor = {
      descriptor: {
        ...descriptor.descriptor,
        tools: [tool],
      },
      source: "inline",
    };
    const audit = new AuditManagerImpl(new FixedClock());
    const consentProvider = () => consent;
    const manager = new ToolManager(() => [resolved], permissions, audit, consentProvider);
    return { manager, audit, tool, resolved };
  };

  it("executes tool handlers and logs output", async () => {
    const { manager, audit } = makeManager({ handler: () => ({ success: true }) });

    const result = await manager.call("search", { query: "mcp" });
    expect(result).toEqual({ success: true });

    const history = audit.history();
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ toolName: "search", output: { success: true } });
  });

  it("throws when consent provider rejects", async () => {
    const { manager } = makeManager({ handler: () => ({ success: true }) }, false);

    await expect(manager.call("search", { query: "mcp" })).rejects.toBeInstanceOf(ConsentRejectedError);
  });

  it("validates tool output against schema", async () => {
    const { manager } = makeManager({ handler: () => ({ success: "yes" }) });

    await expect(manager.call("search", { query: "mcp" })).rejects.toBeInstanceOf(SchemaValidationError);
  });
});
