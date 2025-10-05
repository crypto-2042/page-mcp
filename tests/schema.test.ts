import { describe, expect, it } from "vitest";
import { validateAgainstSchema } from "../src/utils/schema";

const basePath = "$";

describe("validateAgainstSchema", () => {
  it("accepts valid objects", () => {
    const schema = {
      type: "object" as const,
      properties: {
        name: { type: "string", minLength: 2 },
        tags: {
          type: "array",
          items: { type: "string" },
        },
      },
      required: ["name"],
    };

    const result = validateAgainstSchema({ name: "AI", tags: ["page"] }, schema);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("reports detailed errors for invalid values", () => {
    const schema = {
      type: "object" as const,
      properties: {
        name: { type: "string", minLength: 3 },
        count: { type: "integer", minimum: 1 },
      },
      required: ["name", "count"],
    };

    const result = validateAgainstSchema({ name: "ok", count: 0 }, schema);
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: `${basePath}.count`, message: expect.stringContaining("minimum") }),
      ])
    );
  });

  it("validates tuple schemas with positional items", () => {
    const schema = {
      type: "array" as const,
      items: [{ type: "string" }, { type: "number" }],
    };

    const result = validateAgainstSchema(["title", 42], schema);
    expect(result.valid).toBe(true);

    const invalid = validateAgainstSchema(["title", "wrong"], schema);
    expect(invalid.valid).toBe(false);
    expect(invalid.errors[0]?.message).toContain("Expected number");
  });
});
