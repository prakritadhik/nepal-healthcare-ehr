import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { createOrganization, createPatient, getMembership, getMembershipsForUser, listAppointments, listPatients, writeAuditLog } from "./db";
import { getDb } from "./db";
import { organizationInvites } from "../drizzle/schema";
import { randomBytes } from "node:crypto";

const membershipRole = z.enum(["hospital_admin", "doctor", "nurse", "receptionist", "laboratory_user", "radiology_user", "pharmacy_user", "auditor", "patient"]);
const organizationType = z.enum(["hospital", "clinic", "laboratory", "radiology", "pharmacy", "insurer", "other"]);

async function requireOrganizationAccess(ctx: { user: NonNullable<Parameters<typeof getMembership>[0]> extends never ? never : { id: number; role: "user" | "admin" } }, organizationId: number, allowedRoles?: string[]) {
  if (ctx.user.role === "admin") return { membership: null, organization: null };
  const access = await getMembership(ctx.user.id, organizationId);
  if (!access) throw new TRPCError({ code: "FORBIDDEN", message: "You are not a member of this organization." });
  if (allowedRoles && !allowedRoles.includes(access.membership.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Your organization role cannot access this resource." });
  }
  return access;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  workspace: router({
    me: protectedProcedure.query(async ({ ctx }) => ({
      user: ctx.user,
      memberships: await getMembershipsForUser(ctx.user.id),
    })),
  }),

  organization: router({
    list: protectedProcedure.query(({ ctx }) => getMembershipsForUser(ctx.user.id)),
    create: protectedProcedure.input(z.object({
      name: z.string().trim().min(2).max(180),
      type: organizationType,
      province: z.string().trim().max(80).optional(),
      district: z.string().trim().max(100).optional(),
      address: z.string().trim().max(500).optional(),
      registrationNumber: z.string().trim().max(120).optional(),
    })).mutation(async ({ ctx, input }) => {
      const organization = await createOrganization({ ...input, createdById: ctx.user.id });
      await writeAuditLog({ organizationId: organization.id, actorUserId: ctx.user.id, action: "organization.created", entityType: "organization", entityId: String(organization.id) });
      return organization;
    }),
    invite: protectedProcedure.input(z.object({ organizationId: z.number().int().positive(), email: z.string().email(), role: membershipRole })).mutation(async ({ ctx, input }) => {
      await requireOrganizationAccess(ctx, input.organizationId, ["hospital_admin"]);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is not configured." });
      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await db.insert(organizationInvites).values({ ...input, token, invitedById: ctx.user.id, expiresAt });
      await writeAuditLog({ organizationId: input.organizationId, actorUserId: ctx.user.id, action: "organization.invite.created", entityType: "invite", metadata: { email: input.email, role: input.role } });
      return { token, expiresAt };
    }),
  }),

  patient: router({
    list: protectedProcedure.input(z.object({ organizationId: z.number().int().positive(), query: z.string().trim().max(120).optional() })).query(async ({ ctx, input }) => {
      const access = await requireOrganizationAccess(ctx, input.organizationId, ["hospital_admin", "doctor", "nurse", "receptionist", "laboratory_user", "radiology_user", "pharmacy_user", "auditor"]);
      const result = await listPatients(input.organizationId, input.query);
      await writeAuditLog({ organizationId: input.organizationId, actorUserId: ctx.user.id, action: "patient.list.viewed", entityType: "patient", metadata: { query: input.query ?? null, role: access.membership?.role ?? "admin" } });
      return result;
    }),
    create: protectedProcedure.input(z.object({
      organizationId: z.number().int().positive(),
      patientNumber: z.string().trim().min(2).max(64),
      fullName: z.string().trim().min(2).max(180),
      dateOfBirth: z.coerce.date().optional(),
      sex: z.string().trim().max(40).optional(),
      phone: z.string().trim().max(40).optional(),
      email: z.string().email().optional().or(z.literal("")),
      address: z.string().trim().max(500).optional(),
      emergencyContact: z.string().trim().max(500).optional(),
    })).mutation(async ({ ctx, input }) => {
      await requireOrganizationAccess(ctx, input.organizationId, ["hospital_admin", "doctor", "nurse", "receptionist"]);
      const patient = await createPatient({ ...input, email: input.email || undefined, createdById: ctx.user.id });
      await writeAuditLog({ organizationId: input.organizationId, actorUserId: ctx.user.id, action: "patient.created", entityType: "patient", entityId: String(patient.id) });
      return patient;
    }),
  }),

  appointment: router({
    list: protectedProcedure.input(z.object({ organizationId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      await requireOrganizationAccess(ctx, input.organizationId, ["hospital_admin", "doctor", "nurse", "receptionist", "auditor"]);
      return listAppointments(input.organizationId);
    }),
  }),

  audit: router({
    list: protectedProcedure.input(z.object({ organizationId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      await requireOrganizationAccess(ctx, input.organizationId, ["hospital_admin", "auditor"]);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is not configured." });
      const { auditLogs } = await import("../drizzle/schema");
      return db.select().from(auditLogs).where((await import("drizzle-orm")).eq(auditLogs.organizationId, input.organizationId)).orderBy((await import("drizzle-orm")).desc(auditLogs.createdAt));
    }),
  }),
});

export type AppRouter = typeof appRouter;
