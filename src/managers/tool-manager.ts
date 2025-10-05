import {
  AuditManager,
  ConsentProvider,
  ConsentRequest,
  McpTool,
  ResolvedDescriptor,
  ToolHandler,
  ToolSandbox,
} from "../types";
import { PermissionsManagerImpl } from "./permissions-manager";
import { validateAgainstSchema } from "../utils/schema";
import { ConsentRejectedError, SchemaValidationError, ToolNotFoundError } from "../utils/errors";

interface ToolLookupResult {
  tool: McpTool;
  descriptor: ResolvedDescriptor;
}

export class ToolManager {
  constructor(
    private readonly getDescriptors: () => ResolvedDescriptor[],
    private readonly permissions: PermissionsManagerImpl,
    private readonly audit: AuditManager,
    private readonly consentProvider?: ConsentProvider,
    private readonly sandbox?: ToolSandbox
  ) {}

  list(): McpTool[] {
    return this.getDescriptors()
      .flatMap((descriptor) => descriptor.descriptor.tools ?? [])
      .map((tool) => ({ ...tool }));
  }

  async call(name: string, input: unknown): Promise<unknown> {
    const match = this.findTool(name);
    if (!match) {
      throw new ToolNotFoundError(name);
    }
    const { tool, descriptor } = match;

    this.permissions.ensureToolAllowed(tool, descriptor);

    const inputValidation = validateAgainstSchema(input, tool.inputSchema);
    if (!inputValidation.valid) {
      const [error] = inputValidation.errors;
      throw new SchemaValidationError(`Tool input invalid at ${error.path}: ${error.message}`);
    }

    if (descriptor.descriptor.permissions?.consent) {
      if (!this.consentProvider) {
        throw new ConsentRejectedError(tool.name);
      }
      const request: ConsentRequest = { tool, descriptor, input };
      const approved = await Promise.resolve(this.consentProvider(request));
      if (!approved) {
        throw new ConsentRejectedError(tool.name);
      }
    }

    const handler = this.resolveHandler(tool);
    const context = { descriptor, audit: this.audit, permissions: this.permissions };

    try {
      const output = await Promise.resolve(handler(input, context));
      const outputValidation = validateAgainstSchema(output, tool.outputSchema);
      if (!outputValidation.valid) {
        const [error] = outputValidation.errors;
        throw new SchemaValidationError(`Tool output invalid at ${error.path}: ${error.message}`);
      }
      this.audit.log({
        toolName: tool.name,
        descriptorSource: descriptor.source,
        descriptorOrigin: descriptor.origin,
        input,
        output,
      });
      return output;
    } catch (error) {
      this.audit.log({
        toolName: tool.name,
        descriptorSource: descriptor.source,
        descriptorOrigin: descriptor.origin,
        input,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private findTool(name: string): ToolLookupResult | undefined {
    for (const descriptor of this.getDescriptors()) {
      const tool = (descriptor.descriptor.tools ?? []).find((item) => item.name === name);
      if (tool) {
        return { tool, descriptor };
      }
    }
    return undefined;
  }

  private resolveHandler(tool: McpTool): ToolHandler {
    if (tool.handler) {
      return tool.handler;
    }
    if (this.sandbox) {
      return this.sandbox.compile(tool);
    }
    if (tool.script) {
      return unsafeCompile(tool.script);
    }
    throw new Error(`Tool ${tool.name} has no handler or script`);
  }
}

function unsafeCompile(script: string): ToolHandler {
  const factory = new Function("return (" + script + ")");
  const fn = factory();
  if (typeof fn !== "function") {
    throw new Error("Tool script did not produce a function");
  }
  return (input, context) => fn(input, context);
}
