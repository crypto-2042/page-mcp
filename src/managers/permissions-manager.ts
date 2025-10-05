import {
  McpResource,
  McpTool,
  PermissionCheckRequest,
  PermissionCheckResult,
  PermissionsManager,
  ResolvedDescriptor,
} from "../types";
import { getPageUriKind, extractSelector } from "../utils/uri";

const SIDE_EFFECT_ORDER: Record<string, number> = {
  none: 0,
  local: 1,
  network: 2,
};

export class PermissionsManagerImpl implements PermissionsManager {
  check(request: PermissionCheckRequest): PermissionCheckResult {
    if (!request.tool) {
      return { allowed: true };
    }
    return this.evaluateTool(request.tool, request.descriptor);
  }

  ensureResourceAllowed(resource: McpResource, descriptor: ResolvedDescriptor): void {
    const permissions = descriptor.descriptor.permissions;
    if (!permissions || !permissions.selectorsAllow || permissions.selectorsAllow.length === 0) {
      return;
    }
    const kind = getPageUriKind(resource.uri);
    if (kind !== "selector") {
      return;
    }
    const selector = extractSelector(resource.uri);
    if (!selector) {
      return;
    }
    const allowed = permissions.selectorsAllow.some((entry) => matchesSelector(entry, selector));
    if (!allowed) {
      throw new Error(`Selector ${selector} not permitted by descriptor`);
    }
  }

  ensureToolAllowed(tool: McpTool, descriptor: ResolvedDescriptor): void {
    const result = this.evaluateTool(tool, descriptor);
    if (!result.allowed) {
      throw new Error(result.reason ?? "Tool not permitted");
    }
  }

  private evaluateTool(tool: McpTool, descriptor: ResolvedDescriptor): PermissionCheckResult {
    const permissions = descriptor.descriptor.permissions;
    if (!permissions) {
      return { allowed: true };
    }
    const toolEffects = tool.sideEffects ?? "none";
    const descriptorEffects = permissions.sideEffects ?? "local";
    if (SIDE_EFFECT_ORDER[toolEffects] > SIDE_EFFECT_ORDER[descriptorEffects]) {
      return {
        allowed: false,
        reason: `Tool sideEffects ${toolEffects} exceed permissions ${descriptorEffects}`,
      };
    }
    if (toolEffects === "network" && permissions.network === false) {
      return {
        allowed: false,
        reason: "Network operations are disabled",
      };
    }
    return { allowed: true };
  }
}

function matchesSelector(allowed: string, actual: string): boolean {
  if (allowed === "*") {
    return true;
  }
  return allowed === actual;
}
