import {
  AuditManager,
  Clock,
  CreateMcpRuntimeOptions,
  FetchLike,
  McpDescriptor,
  McpResource,
  McpRuntime,
  McpStoreClient,
  McpTool,
  PreparedPrompt,
  RegistryClient,
  RemoteRegistryConfig,
  RemoteStoreConfig,
  ResourceReadOptions,
  ResourceResolver,
  ResourceSubscription,
  ResourceUpdateListener,
  ResolvedDescriptor,
} from "./types";
import { McpManager } from "./managers/mcp-manager";
import { ResourceManager, DomResourceResolver } from "./managers/resource-manager";
import { PermissionsManagerImpl } from "./managers/permissions-manager";
import { ToolManager } from "./managers/tool-manager";
import { PromptManager } from "./managers/prompt-manager";
import { AuditManagerImpl } from "./managers/audit-manager";
import { RemoteRegistryClientImpl } from "./remote/registry-client";
import { RemoteStoreClientImpl } from "./remote/store-client";

export function createMcpRuntime(options: CreateMcpRuntimeOptions = {}): McpRuntime {
  const locale = options.locale ?? (typeof navigator !== "undefined" ? navigator.language : "zh-CN");
  const sourcePreference = options.sourcePreference ?? ["inline", "wellKnown", "remote"];
  const fetcher = options.fetcher ?? (typeof fetch !== "undefined" ? fetch.bind(globalThis) : undefined);
  const clock: Clock = options.clock ?? new SystemClock();
  const resourceResolvers: ResourceResolver[] = options.resourceResolvers ?? [new DomResourceResolver()];
  const storeConfig = options.store ?? options.remote?.store;
  const storeClient = buildStoreClient(storeConfig, fetcher);
  const registryClient = buildRegistryClient(options.remote, fetcher, storeClient);

  const mcpManager = new McpManager({
    fetcher,
    sourcePreference,
    inlineDescriptors: options.inlineDescriptors ?? [],
    registryClient,
    wellKnownPath: options.remote?.wellKnownPath,
  });

  const permissions = new PermissionsManagerImpl();
  const audit = new AuditManagerImpl(clock, options.auditSink);

  const resourceManager = new ResourceManager(
    () => mcpManager.descriptors(),
    resourceResolvers,
    permissions
  );
  const toolManager = new ToolManager(
    () => mcpManager.descriptors(),
    permissions,
    audit,
    options.consentProvider,
    options.toolSandbox
  );
  const promptManager = new PromptManager(() => mcpManager.descriptors());

  return new McpRuntimeImpl(
    locale,
    mcpManager,
    resourceManager,
    toolManager,
    promptManager,
    audit,
    permissions,
    storeClient
  );
}

class McpRuntimeImpl implements McpRuntime {
  constructor(
    public readonly locale: string,
    private readonly mcpManager: McpManager,
    private readonly resourceManager: ResourceManager,
    private readonly toolManager: ToolManager,
    private readonly promptManager: PromptManager,
    public readonly audit: AuditManager,
    public readonly permissions: PermissionsManagerImpl,
    public readonly store: McpStoreClient | undefined
  ) {}

  descriptors(): ResolvedDescriptor[] {
    return this.mcpManager.descriptors();
  }

  get mcp() {
    return {
      register: (descriptor: McpDescriptor) => {
        this.mcpManager.register(descriptor);
      },
      discover: async () => {
        return this.mcpManager.discover();
      },
    };
  }

  get resources() {
    return {
      list: (): McpResource[] => this.resourceManager.list(),
      read: (uri: string, options?: ResourceReadOptions) => this.resourceManager.read(uri, options),
      subscribe: (uri: string, listener: ResourceUpdateListener): Promise<ResourceSubscription> =>
        this.resourceManager.subscribe(uri, listener),
    };
  }

  get tools() {
    return {
      list: (): McpTool[] => this.toolManager.list(),
      call: (name: string, input: unknown): Promise<unknown> => this.toolManager.call(name, input),
    };
  }

  get prompts() {
    return {
      list: () => this.promptManager.list(),
      get: (id: string) => this.promptManager.get(id),
      prepare: (id: string, input: Record<string, unknown>): PreparedPrompt => this.promptManager.prepare(id, input),
    };
  }
}

class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

function buildRegistryClient(
  remote: RemoteRegistryConfig | undefined,
  fetcher: FetchLike | undefined,
  storeClient: McpStoreClient | undefined
): RegistryClient | undefined {
  if (!remote) {
    return undefined;
  }
  return new RemoteRegistryClientImpl(remote, fetcher, storeClient);
}

function buildStoreClient(store: RemoteStoreConfig | undefined, fetcher?: FetchLike): McpStoreClient | undefined {
  if (!store) {
    return undefined;
  }
  return new RemoteStoreClientImpl(store, fetcher);
}
