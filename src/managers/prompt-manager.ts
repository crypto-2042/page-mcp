import { McpPrompt, PreparedPrompt, ResolvedDescriptor } from "../types";
import { validateAgainstSchema } from "../utils/schema";
import { SchemaValidationError } from "../utils/errors";

export class PromptManager {
  constructor(private readonly getDescriptors: () => ResolvedDescriptor[]) {}

  list(): McpPrompt[] {
    return this.getDescriptors()
      .flatMap((descriptor) => descriptor.descriptor.prompts ?? [])
      .map((prompt) => ({ ...prompt }));
  }

  get(id: string): McpPrompt | undefined {
    for (const descriptor of this.getDescriptors()) {
      const prompt = (descriptor.descriptor.prompts ?? []).find((item) => item.id === id);
      if (prompt) {
        return { ...prompt };
      }
    }
    return undefined;
  }

  prepare(id: string, input: Record<string, unknown>): PreparedPrompt {
    const prompt = this.get(id);
    if (!prompt) {
      throw new Error(`Prompt not found: ${id}`);
    }
    const validation = validateAgainstSchema(input, prompt.inputSchema);
    if (!validation.valid) {
      const [error] = validation.errors;
      throw new SchemaValidationError(`Prompt input invalid at ${error.path}: ${error.message}`);
    }
    const resolvedText = interpolateTemplate(prompt.template, input);
    return {
      id: prompt.id,
      language: prompt.language,
      role: prompt.role,
      template: prompt.template,
      resolvedText,
    };
  }
}

const PLACEHOLDER_PATTERN = /{{\s*([\w.]+)\s*}}/g;

function interpolateTemplate(template: string, input: Record<string, unknown>): string {
  return template.replace(PLACEHOLDER_PATTERN, (_, key: string) => {
    const value = lookupPath(input, key.split("."));
    return value === undefined ? "" : String(value);
  });
}

function lookupPath(source: Record<string, unknown>, path: string[]): unknown {
  let current: unknown = source;
  for (const key of path) {
    if (typeof current !== "object" || current === null || !(key in current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}
