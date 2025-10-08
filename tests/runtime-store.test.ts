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
    const fetchStub = vi.fn(async (input: RequestInfo) => {
      const url = String(input);
      if (url.includes("/collections")) {
        return new Response(JSON.stringify(storeResponse), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    const originalFetch = (globalThis as { fetch?: typeof fetch }).fetch;
    (globalThis as { fetch?: typeof fetch }).fetch = fetchStub as unknown as typeof fetch;
    const runtime = createMcpRuntime({
      store: { baseUrl: "https://store.example", apiKey: "demo" },
    });

    expect(runtime.store).toBeDefined();
    const collections = await runtime.store!.listCollections();
    expect(collections.items[0]?.id).toBe("col-1");
    expect(fetchStub).toHaveBeenCalledWith(
      expect.stringContaining("https://store.example/collections"),
      expect.objectContaining({
        headers: expect.any(Headers),
      })
    );
    (globalThis as { fetch?: typeof fetch }).fetch = originalFetch;
  });

  it("omits store client when not configured", () => {
    const runtime = createMcpRuntime();
    expect(runtime.store).toBeUndefined();
  });

  it("derives store client from remote configuration", async () => {
    const fetchStub = vi.fn(async (input: RequestInfo) => {
      const url = String(input);
      if (url.includes("/collections")) {
        return new Response(JSON.stringify(storeResponse), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    const originalFetch = (globalThis as { fetch?: typeof fetch }).fetch;
    (globalThis as { fetch?: typeof fetch }).fetch = fetchStub as unknown as typeof fetch;

    const runtime = createMcpRuntime({
      collectionId: "col-1",
      store: { baseUrl: "https://store.example", apiKey: "demo" },
    });

    expect(runtime.store).toBeDefined();
    const page = await runtime.store!.listCollections();
    expect(page.items[0]?.id).toBe("col-1");
    (globalThis as { fetch?: typeof fetch }).fetch = originalFetch;
  });
});
