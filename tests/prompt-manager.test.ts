import { describe, expect, it } from "vitest";
import type { McpDescriptor, ResolvedDescriptor } from "../src/types";
import { PromptManager } from "../src/managers/prompt-manager";
import { SchemaValidationError } from "../src/utils/errors";

describe("PromptManager", () => {
  const descriptor: McpDescriptor = {
    version: "2025-06-18",
    api: "1.0.0",
    prompts: [
      {
        id: "greet",
        template: "Hello {{ user.name }}",
        inputSchema: {
          type: "object",
          properties: {
            user: {
              type: "object",
              properties: { name: { type: "string" } },
              required: ["name"],
            },
          },
          required: ["user"],
        },
      },
    ],
  };

  const resolved: ResolvedDescriptor = { descriptor, source: "inline" };
  const manager = new PromptManager(() => [resolved]);

  it("replaces placeholders with provided values", () => {
    const prompt = manager.prepare("greet", { user: { name: "Agent" } });
    expect(prompt.resolvedText).toBe("Hello Agent");
  });

  it("throws when input schema validation fails", () => {
    expect(() => manager.prepare("greet", { user: {} })).toThrow(SchemaValidationError);
  });
});
