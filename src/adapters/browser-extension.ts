import { CreateMcpRuntimeOptions, McpDescriptor, RemoteRegistryConfig, RemoteStoreConfig, McpRuntime } from "../types";
import { createMcpRuntime } from "../runtime";

export interface DomainMapping {
  match: string | RegExp;
  remote?: RemoteRegistryConfig;
  store?: RemoteStoreConfig;
  inlineDescriptors?: McpDescriptor[];
}

export interface BrowserExtensionRuntimeOptions extends CreateMcpRuntimeOptions {
  mappings?: DomainMapping[];
  defaultRemote?: RemoteRegistryConfig;
  defaultStore?: RemoteStoreConfig;
}

export function createBrowserExtensionRuntime(options: BrowserExtensionRuntimeOptions = {}): McpRuntime {
  const hostname = getHostname();
  const matching = findMapping(hostname, options.mappings ?? []);

  const merged: CreateMcpRuntimeOptions = {
    ...options,
    remote: options.remote ?? matching?.remote ?? options.defaultRemote,
    store: options.store ?? matching?.store ?? options.defaultStore,
    inlineDescriptors: mergeInlineDescriptors(options.inlineDescriptors, matching?.inlineDescriptors),
  };

  return createMcpRuntime(merged);
}

function getHostname(): string | undefined {
  if (typeof location !== "undefined" && location.hostname) {
    return location.hostname;
  }
  return undefined;
}

function findMapping(hostname: string | undefined, mappings: DomainMapping[]): DomainMapping | undefined {
  if (!hostname) {
    return undefined;
  }
  for (const mapping of mappings) {
    if (typeof mapping.match === "string" && mapping.match === hostname) {
      return mapping;
    }
    if (mapping.match instanceof RegExp && mapping.match.test(hostname)) {
      return mapping;
    }
  }
  return undefined;
}

function mergeInlineDescriptors(
  base?: McpDescriptor[],
  extra?: McpDescriptor[]
): McpDescriptor[] | undefined {
  if (!base && !extra) {
    return undefined;
  }
  return [...(base ?? []), ...(extra ?? [])];
}
