import { FetchLike, McpDescriptor, McpSource, RegistryClient, ResolvedDescriptor } from "../types";

interface McpManagerOptions {
  fetcher: FetchLike | undefined;
  sourcePreference: McpSource[];
  inlineDescriptors: McpDescriptor[];
  registryClient?: RegistryClient;
  wellKnownPath?: string;
}

export class McpManager {
  private readonly inline: McpDescriptor[] = [];
  private resolved: ResolvedDescriptor[] = [];

  constructor(private readonly options: McpManagerOptions) {
    this.inline = [...(options.inlineDescriptors ?? [])];
    this.resolved = this.inline.map<ResolvedDescriptor>((descriptor) => ({ descriptor, source: "inline" }));
  }

  register(descriptor: McpDescriptor): void {
    this.inline.push(descriptor);
    const entry: ResolvedDescriptor = { descriptor, source: "inline" };
    this.resolved = dedupeDescriptors([...this.resolved, entry]);
  }

  async discover(): Promise<ResolvedDescriptor[]> {
    const collected: ResolvedDescriptor[] = [];
    for (const source of this.options.sourcePreference) {
      if (source === "inline") {
        collected.push(
          ...this.inline.map<ResolvedDescriptor>((descriptor) => ({ descriptor, source: "inline" }))
        );
      }
      if (source === "wellKnown") {
        const wellKnown = await this.fetchWellKnown();
        collected.push(...wellKnown);
      }
      if (source === "remote" && this.options.registryClient) {
        const remote = await this.options.registryClient.discover();
        collected.push(...remote);
      }
    }
    this.resolved = dedupeDescriptors(collected);
    return [...this.resolved];
  }

  descriptors(): ResolvedDescriptor[] {
    return [...this.resolved];
  }

  private async fetchWellKnown(): Promise<ResolvedDescriptor[]> {
    if (!this.options.fetcher) {
      return [];
    }
    const target = this.options.wellKnownPath ?? "/.well-known/mcp.json";
    const origin = typeof location !== "undefined" ? location.origin : undefined;
    let url: string;
    try {
      url = origin ? new URL(target, origin).toString() : new URL(target).toString();
    } catch {
      return [];
    }
    const response = await this.options.fetcher(url, { credentials: "include" });
    if (!response.ok) {
      return [];
    }
    const payload = await response.json();
    if (Array.isArray(payload)) {
      return payload
        .filter(isDescriptor)
        .map((descriptor) => ({ descriptor, source: "wellKnown", origin: url }));
    }
    if (isDescriptor(payload)) {
      return [{ descriptor: payload, source: "wellKnown", origin: url }];
    }
    return [];
  }
}

function dedupeDescriptors(descriptors: ResolvedDescriptor[]): ResolvedDescriptor[] {
  const map = new Map<string, ResolvedDescriptor>();
  for (const resolved of descriptors) {
    const key = descriptorKey(resolved.descriptor);
    if (!map.has(key)) {
      map.set(key, resolved);
    }
  }
  return [...map.values()];
}

function descriptorKey(descriptor: McpDescriptor): string {
  const domain = typeof descriptor.metadata?.domain === "string" ? descriptor.metadata.domain : "";
  return `${descriptor.version}|${descriptor.api}|${domain}`;
}

function isDescriptor(input: unknown): input is McpDescriptor {
  if (!input || typeof input !== "object") {
    return false;
  }
  const candidate = input as McpDescriptor;
  return typeof candidate.version === "string" && typeof candidate.api === "string";
}
