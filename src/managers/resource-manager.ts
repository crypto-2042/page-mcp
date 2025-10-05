import {
  McpResource,
  McpResourceContent,
  ResourceReadOptions,
  ResourceResolver,
  ResourceSubscription,
  ResourceUpdateListener,
  ResolvedDescriptor,
} from "../types";
import { extractSelector, extractXPath } from "../utils/uri";
import { ResourceNotFoundError } from "../utils/errors";
import type { PermissionsManagerImpl } from "./permissions-manager";

export class ResourceManager {
  constructor(
    private readonly getDescriptors: () => ResolvedDescriptor[],
    private readonly resolvers: ResourceResolver[],
    private readonly permissions: PermissionsManagerImpl
  ) {}

  list(): McpResource[] {
    return this.getDescriptors()
      .flatMap((resolved) => resolved.descriptor.resources ?? [])
      .map((resource) => ({ ...resource }));
  }

  async read(uri: string, options?: ResourceReadOptions): Promise<McpResourceContent> {
    const match = this.findResource(uri);
    if (!match) {
      throw new ResourceNotFoundError(uri);
    }
    this.permissions.ensureResourceAllowed(match.resource, match.descriptor);
    const resolver = this.resolveResolver(match.resource);
    const content = await resolver.read(match.resource, options);
    return sanitizeContent(content, match.resource.uri);
  }

  async subscribe(uri: string, listener: ResourceUpdateListener): Promise<ResourceSubscription> {
    const match = this.findResource(uri);
    if (!match) {
      throw new ResourceNotFoundError(uri);
    }
    this.permissions.ensureResourceAllowed(match.resource, match.descriptor);
    const resolver = this.resolveResolver(match.resource);
    if (!resolver.subscribe) {
      throw new Error("Resource resolver does not support subscriptions");
    }
    return resolver.subscribe(match.resource, listener);
  }

  private findResource(uri: string): { resource: McpResource; descriptor: ResolvedDescriptor } | undefined {
    for (const descriptor of this.getDescriptors()) {
      const resource = (descriptor.descriptor.resources ?? []).find((item) => item.uri === uri);
      if (resource) {
        return { resource, descriptor };
      }
    }
    return undefined;
  }

  private resolveResolver(resource: McpResource): ResourceResolver {
    const resolver = this.resolvers.find((candidate) => candidate.canHandle(resource));
    if (!resolver) {
      throw new Error(`No resolver found for resource: ${resource.uri}`);
    }
    return resolver;
  }
}

function sanitizeContent(content: McpResourceContent, fallbackUri: string): McpResourceContent {
  if (!content.uri) {
    return { ...content, uri: fallbackUri };
  }
  return content;
}

export class DomResourceResolver implements ResourceResolver {
  canHandle(resource: McpResource): boolean {
    const selector = extractSelector(resource.uri);
    const xpath = extractXPath(resource.uri);
    return Boolean(selector || xpath);
  }

  async read(resource: McpResource): Promise<McpResourceContent> {
    if (typeof document === "undefined") {
      throw new Error("DOM not available in current environment");
    }
    const selector = extractSelector(resource.uri);
    const xpath = extractXPath(resource.uri);
    let text = "";
    if (selector) {
      const element = document.querySelector(selector);
      text = element?.textContent ?? "";
    } else if (xpath) {
      const result = document.evaluate(xpath, document, null, XPathResult.STRING_TYPE, null);
      text = result.stringValue ?? "";
    }
    return {
      uri: resource.uri,
      contents: [
        {
          text,
          mimeType: resource.mimeType ?? "text/plain",
        },
      ],
    };
  }

  async subscribe(): Promise<ResourceSubscription> {
    throw new Error("DOM subscriptions not implemented");
  }
}
