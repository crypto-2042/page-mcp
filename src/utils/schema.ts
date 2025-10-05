import { JsonSchema } from "../types";

export interface ValidationError {
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export function validateAgainstSchema(value: unknown, schema?: JsonSchema): ValidationResult {
  if (!schema) {
    return { valid: true, errors: [] };
  }
  const errors: ValidationError[] = [];
  validate(value, schema, "$", errors);
  return { valid: errors.length === 0, errors };
}

function validate(value: unknown, schema: JsonSchema, path: string, errors: ValidationError[]): void {
  if (schema.enum && !schema.enum.some((option) => deepEqual(option, value))) {
    errors.push({ path, message: `Value is not in enum set` });
    return;
  }

  switch (schema.type) {
    case "string":
      if (typeof value !== "string") {
        errors.push({ path, message: `Expected string` });
        return;
      }
      if (schema.minLength !== undefined && value.length < schema.minLength) {
        errors.push({ path, message: `String shorter than minLength ${schema.minLength}` });
      }
      if (schema.maxLength !== undefined && value.length > schema.maxLength) {
        errors.push({ path, message: `String longer than maxLength ${schema.maxLength}` });
      }
      if (schema.pattern && !(new RegExp(schema.pattern).test(value))) {
        errors.push({ path, message: `String does not match pattern ${schema.pattern}` });
      }
      return;
    case "number":
    case "integer":
      if (typeof value !== "number" || (schema.type === "integer" && !Number.isInteger(value))) {
        errors.push({ path, message: `Expected ${schema.type}` });
        return;
      }
      if (schema.minimum !== undefined && value < schema.minimum) {
        errors.push({ path, message: `Number smaller than minimum ${schema.minimum}` });
      }
      if (schema.maximum !== undefined && value > schema.maximum) {
        errors.push({ path, message: `Number larger than maximum ${schema.maximum}` });
      }
      return;
    case "boolean":
      if (typeof value !== "boolean") {
        errors.push({ path, message: `Expected boolean` });
      }
      return;
    case "array":
      if (!Array.isArray(value)) {
        errors.push({ path, message: `Expected array` });
        return;
      }
      if (Array.isArray(schema.items)) {
        const items = schema.items;
        value.forEach((item, index) => {
          const itemSchema = items[index];
          if (itemSchema) {
            validate(item, itemSchema, `${path}[${index}]`, errors);
          }
        });
      } else if (schema.items) {
        const itemSchema = schema.items as JsonSchema;
        value.forEach((item, index) => {
          validate(item, itemSchema, `${path}[${index}]`, errors);
        });
      }
      return;
    case "object":
    default:
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        errors.push({ path, message: `Expected object` });
        return;
      }
      const typedValue = value as Record<string, unknown>;
      if (schema.required) {
        for (const key of schema.required) {
          if (!(key in typedValue)) {
            errors.push({ path: `${path}.${key}`, message: `Missing required property` });
          }
        }
      }
      if (schema.properties) {
        for (const [key, propertySchema] of Object.entries(schema.properties)) {
          if (key in typedValue) {
            validate(typedValue[key], propertySchema, `${path}.${key}`, errors);
          }
        }
      }
  }
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) {
    return true;
  }
  if (typeof a !== typeof b) {
    return false;
  }
  if (typeof a !== "object" || a === null || b === null) {
    return false;
  }
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== (b as unknown[]).length) {
      return false;
    }
    return a.every((item, index) => deepEqual(item, (b as unknown[])[index]));
  }
  const aKeys = Object.keys(a as Record<string, unknown>);
  const bKeys = Object.keys(b as Record<string, unknown>);
  if (aKeys.length !== bKeys.length) {
    return false;
  }
  return aKeys.every((key) => deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]));
}
