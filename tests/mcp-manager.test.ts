import { describe, expect, it } from "vitest";
import type { FetchLike, McpDescriptor, RegistryClient, ResolvedDescriptor } from "../src/types";
import { McpManager } from "../src/managers/mcp-manager";

class FakeRegistryClient implements RegistryClient {
  constructor(private readonly descriptors: ResolvedDescriptor[]) {}

  async discover(): Promise<ResolvedDescriptor[]> {
    return this.descriptors;
  }
}

describe("McpManager", () => {
  const inlineDescriptor: McpDescriptor = {
    version: "2025-06-18",
    api: "1.0.0",
    tools: [],
  };

  it("registers inline descriptors without duplicates", async () => {
    const manager = new McpManager({
      fetcher: undefined,
      sourcePreference: ["inline"],
      inlineDescriptors: [inlineDescriptor],
    });

    manager.register(inlineDescriptor);
    const result = await manager.discover();
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ source: "inline" });
  });

  it("merges descriptors from inline, well-known, and remote sources", async () => {
    const wellKnownDescriptor: McpDescriptor = {
      version: "2025-06-18",
      api: "1.0.1",
      metadata: { domain: "example.com" },
    };

    const remoteDescriptor: McpDescriptor = {
      version: "2025-07-01",
      api: "1.0.0",
      metadata: { domain: "remote.example" },
    };

    const fetcher: FetchLike = async () => {
      const response = {
        ok: true,
        json: async () => wellKnownDescriptor,
      } satisfies Pick<Response, "ok" | "json">;
      return response as Response;
    };

    const registry = new FakeRegistryClient([
      { descriptor: remoteDescriptor, source: "remote", origin: "https://registry" },
    ]);

    const manager = new McpManager({
      fetcher,
      sourcePreference: ["inline", "wellKnown", "remote"],
      inlineDescriptors: [inlineDescriptor],
      registryClient: registry,
      wellKnownPath: "https://site/.well-known/mcp.json",
    });

    const result = await manager.discover();
    expect(result.map((item) => item.source)).toEqual(["inline", "wellKnown", "remote"]);
  });
});
