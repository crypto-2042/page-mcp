import {
  FetchLike,
  McpDescriptor,
  RegistryClient,
  RemoteRegistryConfig,
  ResolvedDescriptor,
} from "../types";

interface RegistryResponseItem {
  descriptor: McpDescriptor;
  signature?: string;
}

interface RegistryResponse {
  items: RegistryResponseItem[];
}

export class RemoteRegistryClientImpl implements RegistryClient {
  constructor(private readonly config: RemoteRegistryConfig, private readonly fetcher?: FetchLike) {}

  async discover(): Promise<ResolvedDescriptor[]> {
    if (!this.fetcher) {
      return [];
    }
    const response = await this.fetcher(this.config.registryUrl, { credentials: "include" });
    if (!response.ok) {
      throw new Error(`Failed to fetch remote descriptors: ${response.status}`);
    }
    const payload = await response.json();
    const items = normalizeResponse(payload);
    const accepted: ResolvedDescriptor[] = [];
    for (const item of items) {
      if (this.config.verifySignatures === false || !item.signature) {
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

function isDescriptor(input: unknown): input is McpDescriptor {
  if (!input || typeof input !== "object") {
    return false;
  }
  const candidate = input as McpDescriptor;
  return typeof candidate.version === "string" && typeof candidate.api === "string";
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

function base64ToArrayBuffer(value: string): ArrayBuffer {
  if (typeof atob === "function") {
    const binary = atob(value);
    const buffer = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      buffer[i] = binary.charCodeAt(i);
    }
    return buffer.buffer;
  }
  const nodeBuffer = (globalThis as { Buffer?: BufferLike }).Buffer;
  if (nodeBuffer) {
    const binary = nodeBuffer.from(value, "base64");
    return binary.buffer.slice(binary.byteOffset, binary.byteOffset + binary.byteLength);
  }
  throw new Error("No base64 decoder available in this environment");
}

interface BufferLike {
  from(data: string, encoding: string): {
    buffer: ArrayBuffer;
    byteOffset: number;
    byteLength: number;
  };
}
