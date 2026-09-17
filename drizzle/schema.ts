import { index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  username: varchar("username", { length: 80 }).unique(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  accountType: mysqlEnum("accountType", ["oauth", "local"]).default("oauth").notNull(),
  accountStatus: mysqlEnum("accountStatus", ["active", "disabled"]).default("active").notNull(),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "management"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const organizations = mysqlTable("organizations", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 180 }).notNull(),
  type: mysqlEnum("type", ["hospital", "clinic", "laboratory", "radiology", "pharmacy", "insurer", "other"]).notNull(),
  country: varchar("country", { length: 80 }).default("Nepal").notNull(),
  province: varchar("province", { length: 80 }),
  district: varchar("district", { length: 100 }),
  address: text("address"),
  registrationNumber: varchar("registrationNumber", { length: 120 }),
  status: mysqlEnum("status", ["active", "pending", "suspended"]).default("active").notNull(),
  createdById: int("createdById").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ nameIdx: index("organizations_name_idx").on(table.name) }));

export const organizationMembers = mysqlTable("organization_members", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: mysqlEnum("role", ["management", "hospital_admin", "doctor", "nurse", "receptionist", "laboratory_user", "radiology_user", "pharmacy_user", "supplier_user", "auditor", "patient"]).notNull(),
  status: mysqlEnum("status", ["active", "invited", "suspended"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ membershipUnique: uniqueIndex("organization_member_unique").on(table.organizationId, table.userId), userIdx: index("organization_members_user_idx").on(table.userId) }));

export const organizationInvites = mysqlTable("organization_invites", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 320 }).notNull(),
  role: mysqlEnum("role", ["management", "hospital_admin", "doctor", "nurse", "receptionist", "laboratory_user", "radiology_user", "pharmacy_user", "supplier_user", "auditor", "patient"]).notNull(),
  token: varchar("token", { length: 96 }).notNull().unique(),
  status: mysqlEnum("status", ["pending", "accepted", "revoked", "expired"]).default("pending").notNull(),
  invitedById: int("invitedById").notNull().references(() => users.id),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const patients = mysqlTable("patients", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  patientNumber: varchar("patientNumber", { length: 64 }).notNull(),
  medicalNumber: varchar("medicalNumber", { length: 32 }).notNull().unique(),
  citizenshipNumber: varchar("citizenshipNumber", { length: 80 }),
  linkedUserId: int("linkedUserId").references(() => users.id),
  fullName: varchar("fullName", { length: 180 }).notNull(),
  dateOfBirth: timestamp("dateOfBirth"),
  sex: varchar("sex", { length: 40 }),
  bloodGroup: varchar("bloodGroup", { length: 8 }),
  phone: varchar("phone", { length: 40 }),
  email: varchar("email", { length: 320 }),
  address: text("address"),
  emergencyContact: text("emergencyContact"),
  profilePhotoKey: varchar("profilePhotoKey", { length: 512 }),
  status: mysqlEnum("status", ["active", "inactive", "deceased"]).default("active").notNull(),
  createdById: int("createdById").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ orgPatientUnique: uniqueIndex("patient_org_number_unique").on(table.organizationId, table.patientNumber), nameIdx: index("patients_name_idx").on(table.organizationId, table.fullName) }));

export const appointments = mysqlTable("appointments", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  patientId: int("patientId").notNull().references(() => patients.id, { onDelete: "cascade" }),
  clinicianUserId: int("clinicianUserId").references(() => users.id),
  scheduledAt: timestamp("scheduledAt").notNull(),
  department: varchar("department", { length: 120 }),
  reason: text("reason"),
  status: mysqlEnum("status", ["requested", "confirmed", "checked_in", "in_consultation", "completed", "cancelled", "no_show"]).default("requested").notNull(),
  notes: text("notes"),
  createdById: int("createdById").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ orgDateIdx: index("appointments_org_date_idx").on(table.organizationId, table.scheduledAt) }));

export const encounters = mysqlTable("encounters", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  patientId: int("patientId").notNull().references(() => patients.id, { onDelete: "cascade" }),
  clinicianUserId: int("clinicianUserId").notNull().references(() => users.id),
  appointmentId: int("appointmentId").references(() => appointments.id),
  encounterType: varchar("encounterType", { length: 80 }).notNull(),
  clinicalNote: text("clinicalNote"),
  diagnosis: text("diagnosis"),
  status: mysqlEnum("status", ["draft", "signed", "amended"]).default("draft").notNull(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  signedAt: timestamp("signedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const prescriptions = mysqlTable("prescriptions", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  patientId: int("patientId").notNull().references(() => patients.id, { onDelete: "cascade" }),
  prescriberUserId: int("prescriberUserId").notNull().references(() => users.id),
  medication: varchar("medication", { length: 180 }).notNull(),
  instructions: text("instructions"),
  quantity: varchar("quantity", { length: 60 }),
  status: mysqlEnum("status", ["draft", "issued", "dispensed", "cancelled"]).default("draft").notNull(),
  issuedAt: timestamp("issuedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});


export const prescriptionOrders = mysqlTable("prescription_orders", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  patientId: int("patientId").notNull().references(() => patients.id, { onDelete: "cascade" }),
  appointmentId: int("appointmentId").references(() => appointments.id),
  prescriberUserId: int("prescriberUserId").notNull().references(() => users.id),
  prescriptionNumber: varchar("prescriptionNumber", { length: 64 }).notNull().unique(),
  notes: text("notes"),
  sourceDocumentKey: varchar("sourceDocumentKey", { length: 512 }),
  status: mysqlEnum("status", ["draft", "issued", "partially_dispensed", "dispensed", "cancelled"]).default("draft").notNull(),
  issuedAt: timestamp("issuedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const prescriptionItems = mysqlTable("prescription_items", {
  id: int("id").autoincrement().primaryKey(),
  prescriptionOrderId: int("prescriptionOrderId").notNull().references(() => prescriptionOrders.id, { onDelete: "cascade" }),
  medicineName: varchar("medicineName", { length: 180 }).notNull(),
  strength: varchar("strength", { length: 80 }),
  dosage: varchar("dosage", { length: 120 }),
  duration: varchar("duration", { length: 120 }),
  quantity: int("quantity").notNull(),
  instructions: text("instructions"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const pharmacyInventory = mysqlTable("pharmacy_inventory", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  medicineName: varchar("medicineName", { length: 180 }).notNull(),
  genericName: varchar("genericName", { length: 180 }),
  strength: varchar("strength", { length: 80 }),
  unit: varchar("unit", { length: 40 }).default("tablet").notNull(),
  batchNumber: varchar("batchNumber", { length: 80 }),
  quantityOnHand: int("quantityOnHand").default(0).notNull(),
  reorderLevel: int("reorderLevel").default(10).notNull(),
  expiryDate: timestamp("expiryDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ orgMedicineIdx: index("pharmacy_inventory_org_medicine_idx").on(table.organizationId, table.medicineName) }));

export const pharmacyDispensations = mysqlTable("pharmacy_dispensations", {
  id: int("id").autoincrement().primaryKey(),
  prescriptionOrderId: int("prescriptionOrderId").notNull().references(() => prescriptionOrders.id),
  pharmacyOrganizationId: int("pharmacyOrganizationId").notNull().references(() => organizations.id),
  patientId: int("patientId").notNull().references(() => patients.id),
  pharmacistUserId: int("pharmacistUserId").notNull().references(() => users.id),
  dispensedAt: timestamp("dispensedAt").defaultNow().notNull(),
  status: mysqlEnum("status", ["completed", "reversed"]).default("completed").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const supplierProfiles = mysqlTable("supplier_profiles", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 180 }).notNull(),
  contactName: varchar("contactName", { length: 120 }),
  phone: varchar("phone", { length: 40 }),
  email: varchar("email", { length: 320 }),
  address: text("address"),
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  createdById: int("createdById").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const supplyOrders = mysqlTable("supply_orders", {
  id: int("id").autoincrement().primaryKey(),
  pharmacyOrganizationId: int("pharmacyOrganizationId").notNull().references(() => organizations.id),
  supplierProfileId: int("supplierProfileId").notNull().references(() => supplierProfiles.id),
  orderNumber: varchar("orderNumber", { length: 64 }).notNull().unique(),
  status: mysqlEnum("status", ["requested", "confirmed", "in_transit", "received", "cancelled"]).default("requested").notNull(),
  requestedById: int("requestedById").notNull().references(() => users.id),
  confirmedById: int("confirmedById").references(() => users.id),
  confirmedAt: timestamp("confirmedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const supplyOrderItems = mysqlTable("supply_order_items", {
  id: int("id").autoincrement().primaryKey(),
  supplyOrderId: int("supplyOrderId").notNull().references(() => supplyOrders.id, { onDelete: "cascade" }),
  medicineName: varchar("medicineName", { length: 180 }).notNull(),
  quantityRequested: int("quantityRequested").notNull(),
  quantityReceived: int("quantityReceived").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const patientCharges = mysqlTable("patient_charges", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  patientId: int("patientId").notNull().references(() => patients.id, { onDelete: "cascade" }),
  appointmentId: int("appointmentId").references(() => appointments.id),
  description: varchar("description", { length: 180 }).notNull(),
  amount: int("amount").notNull(),
  currency: varchar("currency", { length: 3 }).default("NPR").notNull(),
  status: mysqlEnum("status", ["unpaid", "partially_paid", "paid", "voided"]).default("unpaid").notNull(),
  createdById: int("createdById").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const diagnosticOrders = mysqlTable("diagnostic_orders", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  patientId: int("patientId").notNull().references(() => patients.id, { onDelete: "cascade" }),
  orderedByUserId: int("orderedByUserId").notNull().references(() => users.id),
  modality: mysqlEnum("modality", ["laboratory", "radiology"]).notNull(),
  testName: varchar("testName", { length: 180 }).notNull(),
  status: mysqlEnum("status", ["ordered", "in_progress", "resulted", "verified", "released", "cancelled"]).default("ordered").notNull(),
  resultText: text("resultText"),
  verifiedByUserId: int("verifiedByUserId").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  patientId: int("patientId").references(() => patients.id, { onDelete: "set null" }),
  uploadedById: int("uploadedById").notNull().references(() => users.id),
  title: varchar("title", { length: 180 }).notNull(),
  documentType: varchar("documentType", { length: 80 }).notNull(),
  storageKey: varchar("storageKey", { length: 512 }).notNull(),
  mimeType: varchar("mimeType", { length: 120 }),
  version: int("version").default(1).notNull(),
  status: mysqlEnum("status", ["draft", "active", "archived"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const consents = mysqlTable("consents", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  patientId: int("patientId").notNull().references(() => patients.id, { onDelete: "cascade" }),
  purpose: varchar("purpose", { length: 180 }).notNull(),
  status: mysqlEnum("status", ["requested", "active", "revoked", "expired"]).default("requested").notNull(),
  grantedAt: timestamp("grantedAt"),
  revokedAt: timestamp("revokedAt"),
  createdById: int("createdById").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").references(() => organizations.id, { onDelete: "set null" }),
  actorUserId: int("actorUserId").references(() => users.id, { onDelete: "set null" }),
  action: varchar("action", { length: 120 }).notNull(),
  entityType: varchar("entityType", { length: 80 }),
  entityId: varchar("entityId", { length: 80 }),
  metadata: text("metadata"),
  ipAddress: varchar("ipAddress", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ orgCreatedIdx: index("audit_org_created_idx").on(table.organizationId, table.createdAt) }));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Organization = typeof organizations.$inferSelect;
export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type Patient = typeof patients.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
export type PrescriptionOrder = typeof prescriptionOrders.$inferSelect;
export type PharmacyInventory = typeof pharmacyInventory.$inferSelect;
