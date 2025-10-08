import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import { createBrowserExtensionRuntime } from "../src";
import type { BrowserExtensionRuntimeOptions } from "../src";

const originalLocation = (globalThis as { location?: Location }).location;

beforeAll(() => {
  Object.defineProperty(globalThis, "location", {
    value: { hostname: "docs.example.com" },
    configurable: true,
    writable: true,
  });
});

afterAll(() => {
  if (originalLocation) {
    Object.defineProperty(globalThis, "location", {
      value: originalLocation,
      configurable: true,
      writable: true,
    });
  } else {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete (globalThis as { location?: unknown }).location;
  }
});

describe("createBrowserExtensionRuntime", () => {
  it("uses mapping that matches hostname", () => {
    const fetcher = vi.fn(async () =>
      new Response(JSON.stringify({ items: [], page: 1, pageSize: 10, hasMore: false }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );
    const options: BrowserExtensionRuntimeOptions = {
      fetcher,
      mappings: [
        {
          match: /example\.com$/,
          collectionId: "col-docs",
          store: { baseUrl: "https://store.example" },
        },
      ],
    };
    const runtime = createBrowserExtensionRuntime(options);
    expect(runtime.store).toBeDefined();
  });

  it("falls back to defaults when no mapping", () => {
    const fetcher = vi.fn(async () =>
      new Response(JSON.stringify({ items: [], page: 1, pageSize: 10, hasMore: false }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );
    const runtime = createBrowserExtensionRuntime({
      mappings: [],
      defaultCollectionId: "fallback",
      defaultStore: { baseUrl: "https://store.example" },
      fetcher,
    });
    expect(runtime.store).toBeDefined();
    expect(runtime.mcp).toBeDefined();
  });
});
