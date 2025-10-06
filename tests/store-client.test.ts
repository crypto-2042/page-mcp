import { describe, expect, it, vi } from "vitest";
import { RemoteStoreClientImpl } from "../src/remote/store-client";
import type { RemoteStoreConfig } from "../src/types";

function createFetch(json: unknown) {
  return vi.fn(async () => ({
    ok: true,
    json: async () => json,
  }) as Response);
}

describe("RemoteStoreClientImpl", () => {
  const config: RemoteStoreConfig = {
    baseUrl: "https://store.example/",
    apiKey: "test-key",
    defaultPageSize: 10,
  };

  it("lists collections with query filters", async () => {
    const fetcher = createFetch({
      items: [
        { id: "col-1", name: "Docs", publisher: "example" },
        { id: "col-2", name: "News", publisher: "example" },
      ],
      page: 2,
      pageSize: 5,
      total: 20,
      hasMore: true,
    });
    const client = new RemoteStoreClientImpl(config, fetcher);

    const page = await client.listCollections({ page: 2, pageSize: 5, publisher: "example" });

    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, init] = fetcher.mock.calls[0]!;
    expect(url).toContain("https://store.example/collections?");
    expect(String(url)).toContain("publisher=example");
    expect(init?.headers).toBeDefined();
    const headers = init?.headers;
    if (headers instanceof Headers) {
      expect(headers.get("Authorization")).toBe("Bearer test-key");
    } else {
      expect((headers as Record<string, string>).Authorization).toBe("Bearer test-key");
    }
    expect(page.items).toHaveLength(2);
    expect(page.hasMore).toBe(true);
    expect(page.page).toBe(2);
    expect(page.pageSize).toBe(5);
  });

  it("returns collection overview with normalized entries", async () => {
    const fetcher = createFetch({
      id: "col-1",
      name: "Docs",
      publisher: "example",
      resources: [{ uri: "page://selector/title", name: "Title" }],
      tools: [{ name: "search", sideEffects: "local" }],
      tags: ["docs"],
    });
    const client = new RemoteStoreClientImpl(config, fetcher);

    const overview = await client.getCollectionOverview("col-1");

    expect(overview.resources[0]).toMatchObject({ uri: "page://selector/title", name: "Title" });
    expect(overview.tools[0]).toMatchObject({ name: "search", sideEffects: "local" });
    expect(overview.tags).toEqual(["docs"]);
  });

  it("returns descriptors array even when API returns single descriptor", async () => {
    const fetcher = createFetch({ version: "2025", api: "1.0.0" });
    const client = new RemoteStoreClientImpl(config, fetcher);

    const descriptors = await client.getCollectionDescriptors("col-1");
    expect(descriptors).toHaveLength(1);
    expect(descriptors[0]).toMatchObject({ version: "2025" });
  });
});
