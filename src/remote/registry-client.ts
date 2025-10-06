import {
  FetchLike,
  McpDescriptor,
  McpStoreClient,
  RegistryClient,
  RemoteRegistryConfig,
  ResolvedDescriptor,
} from "../types";
import { base64ToArrayBuffer, isDescriptor, resolveFetch } from "./common";

interface RegistryResponseItem {
  descriptor: McpDescriptor;
  signature?: string;
}

interface RegistryResponse {
  items: RegistryResponseItem[];
}

export class RemoteRegistryClientImpl implements RegistryClient {
  constructor(
    private readonly config: RemoteRegistryConfig,
    private readonly fetcher?: FetchLike,
    private readonly storeClient?: McpStoreClient
  ) {}

  async discover(): Promise<ResolvedDescriptor[]> {
    if (this.config.collectionId) {
      return this.discoverFromStore();
    }
    let fetcher;
    try {
      fetcher = resolveFetch(this.fetcher);
    } catch {
      return [];
    }
    if (!this.config.registryUrl) {
      throw new Error("Remote registry URL not configured");
    }
    const response = await fetcher(this.config.registryUrl, { credentials: "include" });
    if (!response.ok) {
      throw new Error(`Failed to fetch remote descriptors: ${response.status}`);
    }
    const payload = await response.json();
    const items = normalizeResponse(payload);
    const accepted: ResolvedDescriptor[] = [];
    for (const item of items) {
      if (!this.config.verifySignatures || !item.signature || !this.config.publicKey) {
        accepted.push({ descriptor: item.descriptor, source: "remote", origin: this.config.registryUrl });
        continue;
      }
      const verified = await verifyEd25519Signature(item.descriptor, item.signature, this.config.publicKey);
      if (verified) {
        accepted.push({ descriptor: item.descriptor, source: "remote", origin: this.config.registryUrl });
      }
    }
    return accepted;
  }

  private async discoverFromStore(): Promise<ResolvedDescriptor[]> {
    if (!this.storeClient) {
      throw new Error("Store client not configured for remote registry discovery");
    }
    const descriptors = await this.storeClient.getCollectionDescriptors(this.config.collectionId!);
    return descriptors.map((descriptor) => ({
      descriptor,
      source: "remote",
      origin: `store:${this.config.collectionId}`,
    }));
  }
}

function normalizeResponse(payload: unknown): RegistryResponseItem[] {
  if (!payload) {
    return [];
  }
  if (Array.isArray(payload)) {
    return payload.filter(isDescriptor).map((descriptor) => ({ descriptor }));
  }
  if (typeof payload === "object" && Array.isArray((payload as RegistryResponse).items)) {
    return (payload as RegistryResponse).items.filter((item) => isDescriptor(item.descriptor));
  }
  if (isDescriptor(payload)) {
    return [{ descriptor: payload }];
  }
  return [];
}

async function verifyEd25519Signature(descriptor: McpDescriptor, signatureBase64: string, publicKeyBase64: string): Promise<boolean> {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    throw new Error("WebCrypto API not available for signature verification");
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(descriptor));
  const signature = base64ToArrayBuffer(signatureBase64);
  const keyData = base64ToArrayBuffer(publicKeyBase64);
  try {
    const key = await crypto.subtle.importKey("raw", keyData, { name: "Ed25519" }, false, ["verify"]);
    return crypto.subtle.verify({ name: "Ed25519" }, key, signature, data);
  } catch (error) {
    console.error("Failed to verify signature", error);
    return false;
  }
}
