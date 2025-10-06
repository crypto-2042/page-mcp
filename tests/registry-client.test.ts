import { describe, expect, it, vi } from "vitest";
import { RemoteRegistryClientImpl } from "../src/remote/registry-client";
import type { RemoteRegistryConfig, McpStoreClient, McpDescriptor } from "../src/types";

const descriptor: McpDescriptor = {
  version: "2025-06-18",
  api: "1.0.0",
};

describe("RemoteRegistryClientImpl", () => {
  it("discovers descriptors via store collection", async () => {
    const config: RemoteRegistryConfig = { collectionId: "col-1" };
    const storeClient: McpStoreClient = {
      listCollections: vi.fn(async () => ({ items: [], page: 1, pageSize: 1, hasMore: false })),
      getCollectionOverview: vi.fn(async () => ({
        id: "col-1",
        name: "Test",
        publisher: "demo",
        resources: [],
        tools: [],
      })),
      getCollectionDescriptors: vi.fn().mockResolvedValue([descriptor]),
    };

    const client = new RemoteRegistryClientImpl(config, undefined, storeClient);
    const result = await client.discover();

    expect(storeClient.getCollectionDescriptors).toHaveBeenCalledWith("col-1");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ descriptor, origin: "store:col-1" });
  });
});
