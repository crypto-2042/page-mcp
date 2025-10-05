import { describe, expect, it } from "vitest";
import type { McpDescriptor, McpResource, McpResourceContent, ResourceResolver, ResolvedDescriptor } from "../src/types";
import { ResourceManager } from "../src/managers/resource-manager";
import { PermissionsManagerImpl } from "../src/managers/permissions-manager";

class MemoryResolver implements ResourceResolver {
  constructor(private readonly contents: Record<string, McpResourceContent>) {}

  canHandle(resource: McpResource): boolean {
    return this.contents[resource.uri] !== undefined;
  }

  async read(resource: McpResource): Promise<McpResourceContent> {
    const content = this.contents[resource.uri];
    if (!content) {
      throw new Error("missing content");
    }
    return content;
  }
}

describe("ResourceManager", () => {
  const resource = {
    uri: "page://selector/%23title",
    name: "Title",
    mimeType: "text/plain",
  } satisfies McpResource;

  const descriptor: McpDescriptor = {
    version: "2025-06-18",
    api: "1.0.0",
    resources: [resource],
  };

  const resolved: ResolvedDescriptor = { descriptor, source: "inline" };

  it("reads resources using registered resolvers", async () => {
    const permissions = new PermissionsManagerImpl();
    const resolver = new MemoryResolver({
      [resource.uri]: { uri: resource.uri, contents: [{ text: "Hello" }] },
    });
    const manager = new ResourceManager(() => [resolved], [resolver], permissions);

    const result = await manager.read(resource.uri);
    expect(result.contents[0]?.text).toBe("Hello");
  });

  it("denies access when selector not permitted", async () => {
    const permissions = new PermissionsManagerImpl();
    const resolver = new MemoryResolver({
      [resource.uri]: { uri: resource.uri, contents: [{ text: "Hello" }] },
    });
    const locked: ResolvedDescriptor = {
      descriptor: {
        ...descriptor,
        permissions: { selectorsAllow: ["h1"] },
      },
      source: "inline",
    };
    const manager = new ResourceManager(() => [locked], [resolver], permissions);

    await expect(manager.read(resource.uri)).rejects.toThrow(/not permitted/);
  });
});
