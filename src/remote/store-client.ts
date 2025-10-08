import {
  CollectionPage,
  CollectionQuery,
  FetchLike,
  McpCollectionOverview,
  McpCollectionSummary,
  McpDescriptor,
  McpStoreClient,
  RemoteStoreConfig,
} from "../types";

import { McpError } from "../utils/errors";
import { createHeaders, resolveFetch, setHeader, isDescriptor } from "./common";

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
    return payload as CollectionPage<McpCollectionSummary>;
  }

  async getCollectionOverview(collectionId: string): Promise<McpCollectionOverview> {
    const response = await this.request(`/collections/${encodeURIComponent(collectionId)}/overview`);
    const payload = await response.json();
    return payload as McpCollectionOverview;
  }

  async getCollectionDescriptors(collectionId: string): Promise<McpDescriptor[]> {
    const response = await this.request(`/collections/${encodeURIComponent(collectionId)}/mcp`);
    const payload = await response.json();
    if (Array.isArray(payload)) {
      return payload.filter(isDescriptor);
    }
    if (payload && typeof payload === "object") {
      if (isDescriptor(payload)) {
        return [payload];
      }
      const items = (payload as { items?: unknown[] }).items;
      if (Array.isArray(items)) {
        return items.filter(isDescriptor);
      }
    }
    throw new McpError("Unexpected collection descriptor payload");
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
