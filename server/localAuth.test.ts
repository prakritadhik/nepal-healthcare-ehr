import { describe, expect, it } from "vitest";
import { hashLocalPassword, validateLocalPassword, verifyLocalPassword } from "./localAuth";

describe("local account password security", () => {
  it("hashes and verifies passwords without storing the original", () => {
    const password = "KathmanduCare9";
    const encoded = hashLocalPassword(password);
    expect(encoded).not.toContain(password);
    expect(verifyLocalPassword(password, encoded)).toBe(true);
    expect(verifyLocalPassword("wrong-password", encoded)).toBe(false);
  });

  it("requires a strong initial password", () => {
    expect(validateLocalPassword("short")).toBe(false);
    expect(validateLocalPassword("alllowercase123")).toBe(false);
    expect(validateLocalPassword("KathmanduCare9")).toBe(true);
  });
});
