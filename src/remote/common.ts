import { McpDescriptor, FetchLike } from "../types";
import { McpError } from "../utils/errors";

export type FetchImplementation = (input: RequestInfo, init?: RequestInit) => Promise<Response>;

export function resolveFetch(fetcher?: FetchLike): FetchImplementation {
  if (fetcher) {
    return fetcher;
  }
  if (typeof fetch === "function") {
    return fetch.bind(globalThis);
  }
  throw new McpError("Fetch API is not available in this environment");
}

export function isDescriptor(input: unknown): input is McpDescriptor {
  if (!input || typeof input !== "object") {
    return false;
  }
  const candidate = input as McpDescriptor;
  return typeof candidate.version === "string" && typeof candidate.api === "string";
}

export function base64ToArrayBuffer(value: string): ArrayBuffer {
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
  throw new McpError("No base64 decoder available in this environment");
}

interface BufferLike {
  from(data: string, encoding: string): {
    buffer: ArrayBuffer;
    byteOffset: number;
    byteLength: number;
  };
}

export type HeaderContainer = Headers | Record<string, string>;

export function createHeaders(initial: Record<string, string>): HeaderContainer {
  if (typeof Headers !== "undefined") {
    return new Headers(initial);
  }
  return { ...initial };
}

export function setHeader(headers: HeaderContainer, key: string, value: string): void {
  if (headers instanceof Headers) {
    headers.set(key, value);
  } else {
    headers[key] = value;
  }
}
