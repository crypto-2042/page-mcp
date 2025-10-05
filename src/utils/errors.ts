export class McpError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "McpError";
  }
}

export class ResourceNotFoundError extends McpError {
  constructor(uri: string) {
    super(`Resource not found for uri: ${uri}`);
    this.name = "ResourceNotFoundError";
  }
}

export class ToolNotFoundError extends McpError {
  constructor(name: string) {
    super(`Tool not found: ${name}`);
    this.name = "ToolNotFoundError";
  }
}

export class SchemaValidationError extends McpError {
  constructor(message: string) {
    super(message);
    this.name = "SchemaValidationError";
  }
}

export class ConsentRejectedError extends McpError {
  constructor(toolName: string) {
    super(`Consent rejected for tool: ${toolName}`);
    this.name = "ConsentRejectedError";
  }
}
