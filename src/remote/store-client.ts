import {
  CollectionPage,
  CollectionQuery,
  CollectionResourceSummary,
  CollectionToolSummary,
  FetchLike,
  McpCollectionOverview,
  McpCollectionSummary,
  McpDescriptor,
  McpStoreClient,
  RemoteStoreConfig,
} from "../types";

import { McpError } from "../utils/errors";
import { createHeaders, isDescriptor, resolveFetch, setHeader } from "./common";

export class RemoteStoreClientImpl implements McpStoreClient {
  constructor(private readonly config: RemoteStoreConfig, private readonly fetcher?: FetchLike) {}

  async listCollections(query: CollectionQuery = {}): Promise<CollectionPage<McpCollectionSummary>> {
    const params = new URLSearchParams();
    if (query.page !== undefined) params.set("page", String(query.page));
    if (query.pageSize !== undefined) params.set("pageSize", String(query.pageSize));
    if (query.search) params.set("search", query.search);
    if (query.publisher) params.set("publisher", query.publisher);
    if (query.site) params.set("site", query.site);

    const path = params.toString() ? `/collections?${params.toString()}` : "/collections";
    const response = await this.request(path);
    const payload = await response.json();
    return normalizeCollectionPage(payload, query, this.config.defaultPageSize ?? 20);
  }

  async getCollectionOverview(collectionId: string): Promise<McpCollectionOverview> {
    const response = await this.request(`/collections/${encodeURIComponent(collectionId)}/overview`);
    const payload = await response.json();
    return normalizeCollectionOverview(payload);
  }

  async getCollectionDescriptors(collectionId: string): Promise<McpDescriptor[]> {
    const response = await this.request(`/collections/${encodeURIComponent(collectionId)}/descriptors`);
    const payload = await response.json();
    if (Array.isArray(payload) && payload.every(isDescriptor)) {
      return payload;
    }
    if (isDescriptor(payload)) {
      return [payload];
    }
    throw new McpError("Unexpected payload for collection descriptors");
  }

  private async request(path: string): Promise<Response> {
    const url = new URL(path, this.config.baseUrl).toString();
    const headers = createHeaders({ Accept: "application/json" });
    if (this.config.apiKey) {
      setHeader(headers, "Authorization", `Bearer ${this.config.apiKey}`);
    }
    const fetcher = resolveFetch(this.fetcher);
    const response = await fetcher(url, { headers });
    if (!response.ok) {
      throw new McpError(`Remote store request failed (${response.status})`);
    }
    return response;
  }
}

function normalizeCollectionPage(
  payload: unknown,
  query: CollectionQuery,
  defaultPageSize: number
): CollectionPage<McpCollectionSummary> {
  if (!payload || typeof payload !== "object") {
    throw new McpError("Invalid collection page payload");
  }
  const itemsRaw = (payload as { items?: unknown }).items;
  if (!Array.isArray(itemsRaw)) {
    throw new McpError("Collection page missing items array");
  }
  const items = itemsRaw.filter(isCollectionSummary).map(mapCollectionSummary);
  const page = numberOrDefault((payload as { page?: number }).page, query.page ?? 1);
  const pageSize = numberOrDefault((payload as { pageSize?: number }).pageSize, query.pageSize ?? defaultPageSize);
  const total = (payload as { total?: number }).total;
  const hasMore = Boolean((payload as { hasMore?: boolean }).hasMore ?? (payload as { nextPage?: boolean }).nextPage);
  return { items, page, pageSize, total, hasMore };
}

function normalizeCollectionOverview(payload: unknown): McpCollectionOverview {
  if (!payload || typeof payload !== "object") {
    throw new McpError("Invalid collection overview payload");
  }
  const summary = mapCollectionSummary(payload);
  const resourcesRaw = (payload as { resources?: unknown }).resources;
  const toolsRaw = (payload as { tools?: unknown }).tools;
  const resources = Array.isArray(resourcesRaw)
    ? resourcesRaw.filter(isResourceSummary).map(mapResourceSummary)
    : [];
  const tools = Array.isArray(toolsRaw) ? toolsRaw.filter(isToolSummary).map(mapToolSummary) : [];
  return {
    ...summary,
    resources,
    tools,
    tags: Array.isArray((payload as { tags?: unknown }).tags)
      ? ((payload as { tags: unknown[] }).tags as string[]).filter((item): item is string => typeof item === "string")
      : undefined,
  };
}

function isCollectionSummary(input: unknown): input is McpCollectionSummary {
  if (!input || typeof input !== "object") {
    return false;
  }
  return typeof (input as { id?: unknown }).id === "string" && typeof (input as { name?: unknown }).name === "string";
}

function mapCollectionSummary(input: unknown): McpCollectionSummary {
  const summary = input as Partial<McpCollectionSummary>;
  return {
    id: summary.id ?? "",
    name: summary.name ?? "",
    description: summary.description,
    publisher: summary.publisher ?? "unknown",
    bannerUrl: summary.bannerUrl,
    siteUrl: summary.siteUrl,
    createdAt: summary.createdAt,
    updatedAt: summary.updatedAt,
  };
}

function isResourceSummary(input: unknown): input is { uri?: string; name?: string } {
  if (!input || typeof input !== "object") {
    return false;
  }
  return typeof (input as { uri?: unknown }).uri === "string" && typeof (input as { name?: unknown }).name === "string";
}

function mapResourceSummary(input: unknown): CollectionResourceSummary {
  const resource = input as Partial<CollectionResourceSummary>;
  return {
    uri: resource.uri ?? "",
    name: resource.name ?? "",
    description: resource.description,
    mimeType: resource.mimeType,
  };
}

function isToolSummary(input: unknown): input is { name?: string } {
  if (!input || typeof input !== "object") {
    return false;
  }
  return typeof (input as { name?: unknown }).name === "string";
}

function mapToolSummary(input: unknown): CollectionToolSummary {
  const tool = input as Partial<CollectionToolSummary>;
  return {
    name: tool.name ?? "",
    description: tool.description,
    sideEffects: tool.sideEffects,
    inputType: tool.inputType,
    outputType: tool.outputType,
  };
}

function numberOrDefault(value: unknown, defaultValue: number): number {
  return typeof value === "number" && !Number.isNaN(value) ? value : defaultValue;
}
