import { and, asc, count, desc, eq, gte, like, lte, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  appointments,
  auditLogs,
  diagnosticOrders,
  documents,
  encounters,
  organizationMembers,
  organizations,
  patientCharges,
  patients,
  pharmacyDispensations,
  pharmacyInventory,
  prescriptionItems,
  prescriptionOrders,
  supplierProfiles,
  supplyOrderItems,
  supplyOrders,
  users,
  InsertUser,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { randomBytes } from "node:crypto";

let _db: ReturnType<typeof drizzle> | null = null;
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); } catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
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
  for (const field of textFields) if (user[field] !== undefined) { values[field] = user[field] ?? null; updateSet[field] = user[field] ?? null; }
  values.lastSignedIn = user.lastSignedIn ?? new Date();
  updateSet.lastSignedIn = values.lastSignedIn;
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(users).where(eq(users.openId, openId)).limit(1))[0];
}

export async function getMembershipsForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ membership: organizationMembers, organization: organizations }).from(organizationMembers).innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id)).where(and(eq(organizationMembers.userId, userId), eq(organizationMembers.status, "active"))).orderBy(organizations.name);
}

export async function getMembership(userId: number, organizationId: number) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select({ membership: organizationMembers, organization: organizations }).from(organizationMembers).innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id)).where(and(eq(organizationMembers.userId, userId), eq(organizationMembers.organizationId, organizationId), eq(organizationMembers.status, "active"))).limit(1))[0];
}

export async function createOrganization(input: {
  name: string;
  type: "hospital" | "clinic" | "laboratory" | "radiology" | "pharmacy" | "insurer" | "other";
  province?: string;
  district?: string;
  address?: string;
  registrationNumber?: string;
  createdById: number;
  membershipRole?: "management" | "hospital_admin";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  const { membershipRole, ...organizationInput } = input;
  const inserted = await db.insert(organizations).values({ ...organizationInput, country: "Nepal" });
  const organizationId = Number(inserted[0].insertId);
  await db.insert(organizationMembers).values({ organizationId, userId: input.createdById, role: membershipRole ?? "hospital_admin", status: "active" });
  return (await db.select().from(organizations).where(eq(organizations.id, organizationId)).limit(1))[0];
}

export async function listOrganizations() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(organizations).orderBy(asc(organizations.name));
}

export async function listPatients(organizationId: number, query?: string) {
  const db = await getDb();
  if (!db) return [];
  const search = query?.trim();
  const where = search ? and(eq(patients.organizationId, organizationId), or(like(patients.fullName, `%${search}%`), like(patients.medicalNumber, `%${search}%`), like(patients.patientNumber, `%${search}%`), like(patients.citizenshipNumber, `%${search}%`), like(patients.phone, `%${search}%`))) : eq(patients.organizationId, organizationId);
  return db.select().from(patients).where(where).orderBy(desc(patients.createdAt));
}

export async function listPatientsNational(query?: string) {
  const db = await getDb();
  if (!db) return [];
  const search = query?.trim();
  const where = search ? or(like(patients.fullName, `%${search}%`), like(patients.medicalNumber, `%${search}%`), like(patients.patientNumber, `%${search}%`), like(patients.phone, `%${search}%`), like(patients.citizenshipNumber, `%${search}%`)) : undefined;
  return db.select({ patient: patients, organization: organizations }).from(patients).innerJoin(organizations, eq(patients.organizationId, organizations.id)).where(where).orderBy(desc(patients.createdAt));
}

export async function getPatientProfile(patientId: number) {
  const db = await getDb();
  if (!db) return null;
  const patient = (await db.select({ patient: patients, organization: organizations }).from(patients).innerJoin(organizations, eq(patients.organizationId, organizations.id)).where(eq(patients.id, patientId)).limit(1))[0];
  if (!patient) return null;
  const [patientAppointments, patientPrescriptions, patientChargesRows, patientDocuments, patientEncounters, patientDiagnostics] = await Promise.all([
    db.select({ appointment: appointments, organization: organizations }).from(appointments).innerJoin(organizations, eq(appointments.organizationId, organizations.id)).where(eq(appointments.patientId, patientId)).orderBy(desc(appointments.scheduledAt)),
    db.select({ prescription: prescriptionOrders, items: prescriptionItems }).from(prescriptionOrders).leftJoin(prescriptionItems, eq(prescriptionOrders.id, prescriptionItems.prescriptionOrderId)).where(eq(prescriptionOrders.patientId, patientId)).orderBy(desc(prescriptionOrders.createdAt)),
    db.select().from(patientCharges).where(eq(patientCharges.patientId, patientId)).orderBy(desc(patientCharges.createdAt)),
    db.select().from(documents).where(eq(documents.patientId, patientId)).orderBy(desc(documents.createdAt)),
    db.select().from(encounters).where(eq(encounters.patientId, patientId)).orderBy(desc(encounters.createdAt)),
    db.select().from(diagnosticOrders).where(eq(diagnosticOrders.patientId, patientId)).orderBy(desc(diagnosticOrders.createdAt)),
  ]);
  return { ...patient, appointments: patientAppointments, prescriptions: patientPrescriptions, charges: patientChargesRows, documents: patientDocuments, encounters: patientEncounters, diagnostics: patientDiagnostics };
}

export async function createPatient(input: { organizationId: number; patientNumber?: string; fullName: string; citizenshipNumber?: string; dateOfBirth?: Date; sex?: string; bloodGroup?: string; phone?: string; email?: string; address?: string; emergencyContact?: string; createdById: number; }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  const medicalNumber = `SFN-${Date.now().toString(36).toUpperCase()}-${randomBytes(4).toString("hex").toUpperCase()}`;
  const inserted = await db.insert(patients).values({ ...input, patientNumber: input.patientNumber || medicalNumber, medicalNumber });
  return (await db.select().from(patients).where(eq(patients.id, Number(inserted[0].insertId))).limit(1))[0];
}

export async function listAppointments(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ appointment: appointments, patient: patients }).from(appointments).innerJoin(patients, eq(appointments.patientId, patients.id)).where(eq(appointments.organizationId, organizationId)).orderBy(desc(appointments.scheduledAt));
}

export async function createAppointment(input: { organizationId: number; patientId: number; clinicianUserId?: number; scheduledAt: Date; department?: string; reason?: string; notes?: string; createdById: number; }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  const inserted = await db.insert(appointments).values(input);
  return (await db.select().from(appointments).where(eq(appointments.id, Number(inserted[0].insertId))).limit(1))[0];
}

export async function createEncounter(input: { organizationId: number; patientId: number; clinicianUserId: number; appointmentId?: number; encounterType: string; clinicalNote?: string; diagnosis?: string; severity?: "stable" | "needs_follow_up" | "urgent" | "critical"; carePlan?: string; followUpInstructions?: string; }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  const inserted = await db.insert(encounters).values({ ...input, severity: input.severity ?? "stable", status: "signed", signedAt: new Date() });
  return (await db.select().from(encounters).where(eq(encounters.id, Number(inserted[0].insertId))).limit(1))[0];
}

export async function createDiagnosticOrder(input: { organizationId: number; patientId: number; orderedByUserId: number; modality: "laboratory" | "radiology"; testName: string; }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  const inserted = await db.insert(diagnosticOrders).values(input);
  return (await db.select().from(diagnosticOrders).where(eq(diagnosticOrders.id, Number(inserted[0].insertId))).limit(1))[0];
}

export async function completeRadiologyOrder(input: { diagnosticOrderId: number; radiologistUserId: number; resultText?: string; resultDocumentKey?: string; }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  await db.update(diagnosticOrders).set({ status: "resulted", resultText: input.resultText, resultDocumentKey: input.resultDocumentKey, performedByUserId: input.radiologistUserId, performedAt: new Date() }).where(eq(diagnosticOrders.id, input.diagnosticOrderId));
  return (await db.select().from(diagnosticOrders).where(eq(diagnosticOrders.id, input.diagnosticOrderId)).limit(1))[0];
}

export async function getHospitalDashboard(organizationId: number) {
  const db = await getDb();
  if (!db) return { patients: 0, appointmentsToday: 0, doctors: 0, staff: 0, prescriptions: 0, unpaidCharges: 0 };
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(); end.setHours(23, 59, 59, 999);
  const [patientRows, appointmentRows, doctorRows, staffRows, prescriptionRows, chargeRows] = await Promise.all([
    db.select({ value: count() }).from(patients).where(eq(patients.organizationId, organizationId)),
    db.select({ value: count() }).from(appointments).where(and(eq(appointments.organizationId, organizationId), gte(appointments.scheduledAt, start), lte(appointments.scheduledAt, end))),
    db.select({ value: count() }).from(organizationMembers).where(and(eq(organizationMembers.organizationId, organizationId), eq(organizationMembers.role, "doctor"), eq(organizationMembers.status, "active"))),
    db.select({ value: count() }).from(organizationMembers).where(and(eq(organizationMembers.organizationId, organizationId), eq(organizationMembers.status, "active"))),
    db.select({ value: count() }).from(prescriptionOrders).where(eq(prescriptionOrders.organizationId, organizationId)),
    db.select({ value: count() }).from(patientCharges).where(and(eq(patientCharges.organizationId, organizationId), eq(patientCharges.status, "unpaid"))),
  ]);
  return { patients: Number(patientRows[0]?.value ?? 0), appointmentsToday: Number(appointmentRows[0]?.value ?? 0), doctors: Number(doctorRows[0]?.value ?? 0), staff: Number(staffRows[0]?.value ?? 0), prescriptions: Number(prescriptionRows[0]?.value ?? 0), unpaidCharges: Number(chargeRows[0]?.value ?? 0) };
}

export async function getManagementDashboard() {
  const db = await getDb();
  if (!db) return { organizations: 0, patients: 0, doctors: 0, staff: 0, prescriptions: 0 };
  const [orgRows, patientRows, doctorRows, staffRows, prescriptionRows] = await Promise.all([
    db.select({ value: count() }).from(organizations),
    db.select({ value: count() }).from(patients),
    db.select({ value: count() }).from(organizationMembers).where(and(eq(organizationMembers.role, "doctor"), eq(organizationMembers.status, "active"))),
    db.select({ value: count() }).from(organizationMembers).where(eq(organizationMembers.status, "active")),
    db.select({ value: count() }).from(prescriptionOrders),
  ]);
  return { organizations: Number(orgRows[0]?.value ?? 0), patients: Number(patientRows[0]?.value ?? 0), doctors: Number(doctorRows[0]?.value ?? 0), staff: Number(staffRows[0]?.value ?? 0), prescriptions: Number(prescriptionRows[0]?.value ?? 0) };
}

export async function createPrescription(input: { organizationId: number; patientId: number; appointmentId?: number; prescriberUserId: number; prescriptionNumber: string; notes?: string; sourceDocumentKey?: string; items: Array<{ medicineName: string; strength?: string; dosage?: string; duration?: string; quantity: number; dispensingMode?: "one_time" | "regular"; refillLimit?: number; instructions?: string }>; }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  return db.transaction(async (tx) => {
    const inserted = await tx.insert(prescriptionOrders).values({ organizationId: input.organizationId, patientId: input.patientId, appointmentId: input.appointmentId, prescriberUserId: input.prescriberUserId, prescriptionNumber: input.prescriptionNumber, notes: input.notes, sourceDocumentKey: input.sourceDocumentKey, status: "issued", issuedAt: new Date() });
    const orderId = Number(inserted[0].insertId);
    await tx.insert(prescriptionItems).values(input.items.map(item => ({ ...item, prescriptionOrderId: orderId, dispensingMode: item.dispensingMode ?? "one_time", refillLimit: item.refillLimit ?? 0 })));
    return (await tx.select().from(prescriptionOrders).where(eq(prescriptionOrders.id, orderId)).limit(1))[0];
  });
}

export async function listPrescriptions(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ order: prescriptionOrders, patient: patients }).from(prescriptionOrders).innerJoin(patients, eq(prescriptionOrders.patientId, patients.id)).where(eq(prescriptionOrders.organizationId, organizationId)).orderBy(desc(prescriptionOrders.createdAt));
}

export async function findPrescription(prescriptionNumber: string) {
  const db = await getDb();
  if (!db) return undefined;
  const order = (await db.select({ order: prescriptionOrders, patient: patients }).from(prescriptionOrders).innerJoin(patients, eq(prescriptionOrders.patientId, patients.id)).where(eq(prescriptionOrders.prescriptionNumber, prescriptionNumber.trim())).limit(1))[0];
  if (!order) return undefined;
  const items = await db.select().from(prescriptionItems).where(eq(prescriptionItems.prescriptionOrderId, order.order.id));
  return { ...order, items };
}

export async function dispensePrescription(input: { prescriptionOrderId: number; pharmacyOrganizationId: number; patientId: number; pharmacistUserId: number; quantityDispensed?: number; notes?: string; }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  return db.transaction(async (tx) => {
    const order = (await tx.select().from(prescriptionOrders).where(eq(prescriptionOrders.id, input.prescriptionOrderId)).limit(1))[0];
    if (!order || order.patientId !== input.patientId) throw new Error("Prescription could not be verified for this patient.");
    if (order.status === "dispensed" || order.status === "cancelled") throw new Error("This prescription is no longer available for dispensing.");
    const items = await tx.select().from(prescriptionItems).where(eq(prescriptionItems.prescriptionOrderId, order.id));
    if (!items.length) throw new Error("This prescription has no medicine items.");
    for (const item of items) {
      const exhausted = item.dispensingMode === "one_time" ? item.refillsUsed >= 1 : item.refillLimit > 0 && item.refillsUsed >= item.refillLimit;
      if (exhausted) throw new Error(`${item.medicineName} has reached its approved dispensing limit.`);
    }
    for (const item of items) {
      const requestedQuantity = items.length === 1 && input.quantityDispensed ? input.quantityDispensed : item.quantity;
      const stock = (await tx.select().from(pharmacyInventory).where(and(eq(pharmacyInventory.organizationId, input.pharmacyOrganizationId), eq(pharmacyInventory.medicineName, item.medicineName))).limit(1))[0];
      if (!stock || stock.quantityOnHand < requestedQuantity) throw new Error(`Insufficient stock for ${item.medicineName}.`);
      await tx.update(pharmacyInventory).set({ quantityOnHand: stock.quantityOnHand - requestedQuantity }).where(eq(pharmacyInventory.id, stock.id));
      await tx.update(prescriptionItems).set({ refillsUsed: item.refillsUsed + 1 }).where(eq(prescriptionItems.id, item.id));
    }
    const remaining = items.some(item => item.dispensingMode === "regular" && item.refillLimit > item.refillsUsed + 1);
    const totalDispensed = input.quantityDispensed ?? items.reduce((sum, item) => sum + item.quantity, 0);
    await tx.insert(pharmacyDispensations).values({ ...input, quantityDispensed: totalDispensed });
    await tx.update(prescriptionOrders).set({ status: remaining ? "partially_dispensed" : "dispensed" }).where(eq(prescriptionOrders.id, order.id));
    return { success: true, prescriptionOrderId: order.id, quantityDispensed: totalDispensed, remainingRefills: remaining };
  });
}

export async function listInventory(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pharmacyInventory).where(eq(pharmacyInventory.organizationId, organizationId)).orderBy(asc(pharmacyInventory.medicineName));
}

export async function listSupplyOrders() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ order: supplyOrders, supplier: supplierProfiles }).from(supplyOrders).innerJoin(supplierProfiles, eq(supplyOrders.supplierProfileId, supplierProfiles.id)).orderBy(desc(supplyOrders.createdAt));
}

export async function createSupplyOrder(input: { pharmacyOrganizationId: number; supplierProfileId: number; orderNumber: string; requestedById: number; items: Array<{ medicineName: string; quantityRequested: number }> }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  return db.transaction(async (tx) => {
    const inserted = await tx.insert(supplyOrders).values({ pharmacyOrganizationId: input.pharmacyOrganizationId, supplierProfileId: input.supplierProfileId, orderNumber: input.orderNumber, requestedById: input.requestedById });
    const orderId = Number(inserted[0].insertId);
    await tx.insert(supplyOrderItems).values(input.items.map(item => ({ ...item, supplyOrderId: orderId })));
    return orderId;
  });
}

export async function confirmSupplyOrder(orderId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  await db.update(supplyOrders).set({ status: "confirmed", confirmedById: userId, confirmedAt: new Date() }).where(eq(supplyOrders.id, orderId));
  return { success: true };
}

export async function seedSamplePatients(organizationId: number, createdById: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  const existing = await db.select({ value: count() }).from(patients).where(eq(patients.organizationId, organizationId));
  if (Number(existing[0]?.value ?? 0) > 0) return { inserted: 0, skipped: true };
  const names = ["Pradeep Kumar Adhikari", "Anita Thapa", "Suresh Bahadur Gurung", "Mina Karki", "Ramesh Shrestha", "Sabina Rai", "Bikash Poudel", "Nirmala Tamang", "Deepak Bista", "Saraswati Khadka"];
  const rows = names.map((fullName, index) => ({ organizationId, patientNumber: `NP-DEMO-${String(index + 1).padStart(4, "0")}`, medicalNumber: `SFN-DEMO-${String(index + 1).padStart(6, "0")}`, fullName, sex: index % 2 === 0 ? "Male" : "Female", phone: `+977 98${String(10000000 + index * 1379).slice(0, 8)}`, address: index % 2 === 0 ? "Kathmandu, Bagmati" : "Lalitpur, Bagmati", createdById }));
  await db.insert(patients).values(rows);
  return { inserted: rows.length, skipped: false };
}

export async function writeAuditLog(input: { organizationId?: number; actorUserId?: number; action: string; entityType?: string; entityId?: string; metadata?: Record<string, unknown>; ipAddress?: string; }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(auditLogs).values({ ...input, metadata: input.metadata ? JSON.stringify(input.metadata) : undefined });
}
