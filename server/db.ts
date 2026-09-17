import { and, desc, eq, like, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  auditLogs,
  appointments,
  InsertUser,
  organizationMembers,
  organizations,
  patients,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  values.lastSignedIn = user.lastSignedIn ?? new Date();
  updateSet.lastSignedIn = values.lastSignedIn;
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getMembershipsForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ membership: organizationMembers, organization: organizations })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
    .where(and(eq(organizationMembers.userId, userId), eq(organizationMembers.status, "active")))
    .orderBy(organizations.name);
}

export async function getMembership(userId: number, organizationId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select({ membership: organizationMembers, organization: organizations })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
    .where(and(eq(organizationMembers.userId, userId), eq(organizationMembers.organizationId, organizationId), eq(organizationMembers.status, "active")))
    .limit(1);
  return result[0];
}

export async function createOrganization(input: {
  name: string;
  type: "hospital" | "clinic" | "laboratory" | "radiology" | "pharmacy" | "insurer" | "other";
  province?: string;
  district?: string;
  address?: string;
  registrationNumber?: string;
  createdById: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  const inserted = await db.insert(organizations).values({ ...input, country: "Nepal" });
  const organizationId = Number(inserted[0].insertId);
  await db.insert(organizationMembers).values({ organizationId, userId: input.createdById, role: "hospital_admin", status: "active" });
  return (await db.select().from(organizations).where(eq(organizations.id, organizationId)).limit(1))[0];
}

export async function listPatients(organizationId: number, query?: string) {
  const db = await getDb();
  if (!db) return [];
  const search = query?.trim();
  const where = search
    ? and(eq(patients.organizationId, organizationId), or(like(patients.fullName, `%${search}%`), like(patients.patientNumber, `%${search}%`), like(patients.phone, `%${search}%`)))
    : eq(patients.organizationId, organizationId);
  return db.select().from(patients).where(where).orderBy(desc(patients.createdAt));
}

export async function createPatient(input: {
  organizationId: number;
  patientNumber: string;
  fullName: string;
  dateOfBirth?: Date;
  sex?: string;
  phone?: string;
  email?: string;
  address?: string;
  emergencyContact?: string;
  createdById: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  const inserted = await db.insert(patients).values(input);
  const patientId = Number(inserted[0].insertId);
  return (await db.select().from(patients).where(eq(patients.id, patientId)).limit(1))[0];
}

export async function listAppointments(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(appointments).where(eq(appointments.organizationId, organizationId)).orderBy(desc(appointments.scheduledAt));
}

export async function writeAuditLog(input: {
  organizationId?: number;
  actorUserId?: number;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(auditLogs).values({
    ...input,
    metadata: input.metadata ? JSON.stringify(input.metadata) : undefined,
  });
}
