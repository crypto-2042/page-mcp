import { describe, expect, it } from "vitest";
import type {
  FetchLike,
  McpDescriptor,
  McpStoreClient,
  CollectionPage,
  McpCollectionSummary,
  McpCollectionOverview,
} from "../src/types";
import { McpManager } from "../src/managers/mcp-manager";

class FakeStoreClient implements McpStoreClient {
  constructor(private readonly descriptors: McpDescriptor[]) {}

  async listCollections(): Promise<CollectionPage<McpCollectionSummary>> {
    return { items: [], page: 1, pageSize: 1, hasMore: false };
  }

  async getCollectionOverview(): Promise<McpCollectionOverview> {
    return {
      id: "col-1",
      name: "Test",
      publisher: "demo",
      resources: [],
      tools: [],
    };
  }

  async getCollectionDescriptors(collectionId: string): Promise<McpDescriptor[]> {
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

    const storeClient = new FakeStoreClient([remoteDescriptor]);

    const manager = new McpManager({
      fetcher,
      sourcePreference: ["inline", "wellKnown", "remote"],
      inlineDescriptors: [inlineDescriptor],
      mcpId: "col-1",
      mcpStoreClient: storeClient,
      wellKnownPath: "https://site/.well-known/mcp.json",
    });

    const result = await manager.discover();
    expect(result.map((item) => item.source)).toEqual(["inline", "wellKnown", "remote"]);
    const remote = result.find((item) => item.source === "remote");
    expect(remote?.origin).toBe("store:col-1");
  });
});
