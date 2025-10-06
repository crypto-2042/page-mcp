import { describe, expect, it, vi } from "vitest";
import { createMcpRuntime } from "../src";

const storeResponse = {
  items: [{ id: "col-1", name: "Starter", publisher: "demo" }],
  page: 1,
  pageSize: 20,
  hasMore: false,
};

describe("Runtime store integration", () => {
  it("exposes store client when configured", async () => {
    const fetcher = vi.fn(async (input: RequestInfo) => {
      const url = String(input);
      if (url.includes("/collections")) {
        return {
          ok: true,
          json: async () => storeResponse,
        } as Response;
      }
      return {
        ok: true,
        json: async () => [],
      } as Response;
    });

    const runtime = createMcpRuntime({
      store: { baseUrl: "https://store.example", apiKey: "demo" },
      fetcher,
    });

    expect(runtime.store).toBeDefined();
    const collections = await runtime.store!.listCollections();
    expect(collections.items[0]?.id).toBe("col-1");
    expect(fetcher).toHaveBeenCalledWith(
      expect.stringContaining("https://store.example/collections"),
      expect.objectContaining({
        headers: expect.any(Headers),
      })
    );
  });

  it("omits store client when not configured", () => {
    const runtime = createMcpRuntime();
    expect(runtime.store).toBeUndefined();
  });
});
