import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(role: "user" | "admin" = "user"): TrpcContext {
  const user: AuthenticatedUser = {
    id: 987654,
    openId: `test-${role}-user`,
    email: `${role}@example.com`,
    name: "Test User",
    loginMethod: "test",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("healthcare organization access", () => {
  it("returns the authenticated workspace shape", async () => {
    const caller = appRouter.createCaller(createContext());
    const result = await caller.workspace.me();
    expect(result.user.openId).toBe("test-user-user");
    expect(Array.isArray(result.memberships)).toBe(true);
  });

  it("rejects patient access when the user is not a member of the organization", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.patient.list({ organizationId: 999999 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows platform admins to query an organization boundary", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    const result = await caller.organization.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("keeps global management controls away from ordinary users", async () => {
    const caller = appRouter.createCaller(createContext("user"));
    await expect(caller.management.dashboard()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("keeps nationwide patient search away from ordinary users", async () => {
    const caller = appRouter.createCaller(createContext("user"));
    await expect(caller.management.patientSearch({ query: "SFN-" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
