export type McpSource = "inline" | "wellKnown" | "remote";

export interface McpResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface McpResourceContent {
  uri: string;
  contents: Array<{ text?: string; json?: unknown; mimeType?: string }>;
  lastModified?: string;
}

export interface JsonSchema {
  type?: "object" | "string" | "number" | "integer" | "boolean" | "array" | "null";
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema | JsonSchema[];
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  description?: string;
  default?: unknown;
  format?: string;
}

export interface McpTool {
  name: string;
  description?: string;
  inputSchema?: JsonSchema;
  outputSchema?: JsonSchema;
  sideEffects?: "none" | "local" | "network";
  script?: string;
  handler?: ToolHandler;
  metadata?: Record<string, unknown>;
}

export interface McpPrompt {
  id: string;
  name?: string;
  description?: string;
  role?: "system" | "user" | "developer";
  language?: string;
  template: string;
  inputSchema?: JsonSchema;
  hints?: Record<string, unknown>;
}

export interface McpPermissions {
  selectorsAllow?: string[];
  network?: boolean;
  sideEffects?: "none" | "local" | "network";
  consent?: boolean;
  [key: string]: unknown;
}

export interface McpDescriptor {
  version: string;
  api: string;
  resources?: McpResource[];
  tools?: McpTool[];
  prompts?: McpPrompt[];
  permissions?: McpPermissions;
  metadata?: Record<string, unknown>;
}

export interface ResolvedDescriptor {
  descriptor: McpDescriptor;
  source: McpSource;
  origin?: string;
}

export interface CreateMcpRuntimeOptions {
  locale?: string;
  sourcePreference?: McpSource[];
  inlineDescriptors?: McpDescriptor[];
  remote?: RemoteRegistryConfig;
  store?: RemoteStoreConfig;
  fetcher?: FetchLike;
  consentProvider?: ConsentProvider;
  resourceResolvers?: ResourceResolver[];
  toolSandbox?: ToolSandbox;
  auditSink?: AuditSink;
  clock?: Clock;
}

export interface RemoteRegistryConfig {
  registryUrl?: string;
  publicKey?: string;
  wellKnownPath?: string;
  verifySignatures?: boolean;
  collectionId?: string;
}

export interface RemoteStoreConfig {
  baseUrl: string;
  apiKey?: string;
  defaultPageSize?: number;
}

export type FetchLike = (input: RequestInfo, init?: RequestInit) => Promise<Response>;

export interface ConsentRequest {
  tool: McpTool;
  descriptor: ResolvedDescriptor;
  input: unknown;
}

export type ConsentProvider = (request: ConsentRequest) => Promise<boolean> | boolean;

export interface ToolExecutionContext {
  descriptor: ResolvedDescriptor;
  audit: AuditManager;
  permissions: PermissionsManager;
}

export type ToolHandler = (input: unknown, context: ToolExecutionContext) => unknown | Promise<unknown>;

export interface ToolSandbox {
  compile(tool: McpTool): ToolHandler;
}

export interface ResourceReadOptions {
  signal?: AbortSignal;
}

export interface ResourceResolver {
  canHandle(resource: McpResource): boolean;
  read(resource: McpResource, options?: ResourceReadOptions): Promise<McpResourceContent>;
  subscribe?(resource: McpResource, listener: ResourceUpdateListener): Promise<ResourceSubscription> | ResourceSubscription;
}

export type ResourceUpdateListener = (content: McpResourceContent) => void;

export interface ResourceSubscription {
  unsubscribe(): void;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  toolName: string;
  descriptorSource: McpSource;
  descriptorOrigin?: string;
  input: unknown;
  output?: unknown;
  error?: string;
}

export interface AuditSink {
  write(entry: AuditEntry): void;
}

export interface AuditEventInput {
  toolName: string;
  descriptorSource: McpSource;
  descriptorOrigin?: string;
  input: unknown;
  output?: unknown;
  error?: string;
  timestamp?: string;
  id?: string;
}

export interface AuditManager extends AuditSink {
  log(event: AuditEventInput): AuditEntry;
  history(): AuditEntry[];
}

export interface PermissionsManager {
  check(request: PermissionCheckRequest): PermissionCheckResult;
}

export interface PermissionCheckRequest {
  descriptor: ResolvedDescriptor;
  tool?: McpTool;
}

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
}

export interface PreparedPrompt {
  id: string;
  language?: string;
  role?: "system" | "user" | "developer";
  template: string;
  resolvedText: string;
}

export interface McpRuntime {
  locale: string;
  descriptors(): ResolvedDescriptor[];
  mcp: {
    register(descriptor: McpDescriptor): void;
    discover(): Promise<ResolvedDescriptor[]>;
  };
  resources: {
    list(): McpResource[];
    read(uri: string, options?: ResourceReadOptions): Promise<McpResourceContent>;
    subscribe(uri: string, listener: ResourceUpdateListener): Promise<ResourceSubscription>;
  };
  tools: {
    list(): McpTool[];
    call(name: string, input: unknown): Promise<unknown>;
  };
  prompts: {
    list(): McpPrompt[];
    get(id: string): McpPrompt | undefined;
    prepare(id: string, input: Record<string, unknown>): PreparedPrompt;
  };
  audit: AuditManager;
  permissions: PermissionsManager;
  store: McpStoreClient | undefined;
}

export interface Clock {
  now(): Date;
}

export interface RegistryClient {
  discover(): Promise<ResolvedDescriptor[]>;
}

export interface McpStoreClient {
  listCollections(query?: CollectionQuery): Promise<CollectionPage<McpCollectionSummary>>;
  getCollectionOverview(collectionId: string): Promise<McpCollectionOverview>;
  getCollectionDescriptors(collectionId: string): Promise<McpDescriptor[]>;
}

export interface CollectionQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  publisher?: string;
  site?: string;
}

export interface CollectionPage<T> {
  items: T[];
  page: number;
  pageSize: number;
  total?: number;
  hasMore: boolean;
}

export interface McpCollectionSummary {
  id: string;
  name: string;
  description?: string;
  publisher: string;
  bannerUrl?: string;
  siteUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface McpCollectionOverview {
  id: string;
  name: string;
  description?: string;
  publisher: string;
  bannerUrl?: string;
  siteUrl?: string;
  resources: CollectionResourceSummary[];
  tools: CollectionToolSummary[];
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CollectionResourceSummary {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface CollectionToolSummary {
  name: string;
  description?: string;
  sideEffects?: "none" | "local" | "network";
  inputType?: string;
  outputType?: string;
}
