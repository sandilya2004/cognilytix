import { describe, expect, it } from "vitest";
import { customerStorySchema } from "./customer-stories";

const valid = { name: "Alex", email: "alex@example.com", description: "Useful retail analysis." };
describe("customer comment requirements", () => {
  it("requires name", () => expect(customerStorySchema.safeParse({ ...valid, name: "  " }).success).toBe(false));
  it("requires a valid email", () => {
    expect(customerStorySchema.safeParse({ ...valid, email: "" }).success).toBe(false);
    expect(customerStorySchema.safeParse({ ...valid, email: "invalid" }).success).toBe(false);
  });
  it("requires description", () => expect(customerStorySchema.safeParse({ ...valid, description: " " }).success).toBe(false));
  it("allows suggestions to be omitted", () => expect(customerStorySchema.safeParse(valid).success).toBe(true));
  it("accepts optional suggestions", () => expect(customerStorySchema.parse({ ...valid, suggestions: "More charts" }).suggestions).toBe("More charts"));
});