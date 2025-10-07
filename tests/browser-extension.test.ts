import { describe, expect, it, vi } from "vitest";
import { createBrowserExtensionRuntime } from "../src";
import type { BrowserExtensionRuntimeOptions } from "../src";

vi.stubGlobal("location", { hostname: "docs.example.com" });

describe("createBrowserExtensionRuntime", () => {
  it("uses mapping that matches hostname", () => {
    const options: BrowserExtensionRuntimeOptions = {
      mappings: [
        {
          match: /example\.com$/,
          remote: { collectionId: "col-docs", store: { baseUrl: "https://store.example" } },
        },
      ],
    };
    const runtime = createBrowserExtensionRuntime(options);
    expect(runtime.store).toBeDefined();
  });

  it("falls back to defaults when no mapping", () => {
    const runtime = createBrowserExtensionRuntime({
      mappings: [],
      defaultRemote: { collectionId: "fallback", store: { baseUrl: "https://store.example" } },
    });
    expect(runtime.store).toBeDefined();
    expect(runtime.mcp).toBeDefined();
  });
});
