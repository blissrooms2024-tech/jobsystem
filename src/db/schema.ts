import {
  pgTable,
  pgEnum,
  uuid,
  text,
  varchar,
  boolean,
  timestamp,
  date,
  time,
  numeric,
  doublePrecision,
  integer,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

export const roleEnum = pgEnum("role", [
  "boss",
  "admin",
  "supervisor",
  "employee",
]);

export const payTypeEnum = pgEnum("pay_type", ["per_job", "base"]);

export const jobStatusEnum = pgEnum("job_status", [
  "assigned",
  "in_progress",
  "completed",
  "cancelled",
  "missed",
]);

export const payrollStatusEnum = pgEnum("payroll_status", ["draft", "paid"]);

export const periodTypeEnum = pgEnum("period_type", ["custom", "month"]);

export const leaveStatusEnum = pgEnum("leave_status", [
  "pending",
  "approved",
  "rejected",
  "cancelled",
]);

// Backs atomic sequential code generation (P0001, L0001, U001, ...) via a
// single `INSERT ... ON CONFLICT DO UPDATE ... RETURNING` per name — the row
// lock Postgres takes during that upsert is what makes it collision-proof,
// unlike a `SELECT MAX(...) + 1` read-then-write. See src/lib/sequence.ts.
export const codeSequences = pgTable("code_sequences", {
  name: varchar("name", { length: 40 }).primaryKey(),
  value: integer("value").notNull().default(0),
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userCode: varchar("user_code", { length: 20 }).notNull().unique(),
    // Separate from userCode (which is auto-generated U001-style) — this is
    // a free-text ID the admin sets by hand, e.g. to match an external HR
    // reference number that predates this system.
    staffId: varchar("staff_id", { length: 50 }),
    name: text("name").notNull(),
    username: varchar("username", { length: 100 }).notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    mustChangePassword: boolean("must_change_password")
      .notNull()
      .default(false),
    // Brute-force protection: increments on each wrong password, resets on
    // success. Locked out for LOCKOUT_MS (see auth.ts) once the threshold
    // is hit, rather than failing every attempt against bcrypt forever.
    failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    role: roleEnum("role").notNull().default("employee"),
    supervisorId: uuid("supervisor_id"),
    phone: varchar("phone", { length: 30 }),
    active: boolean("active").notNull().default(true),
    // Free text (not an enum) — the legacy system let admins type any staff
    // type with autocomplete suggestions (Cleaner, Posting Agent, Room Agent,
    // Maintenance, Electrician, ...), not a fixed closed list.
    staffType: text("staff_type"),
    icPassport: varchar("ic_passport", { length: 50 }),
    address: text("address"),
    email: varchar("email", { length: 255 }),
    emergencyContact: text("emergency_contact"),
    bankName: varchar("bank_name", { length: 100 }),
    bankAccount: varchar("bank_account", { length: 50 }),
    // Posting Agents post updates on their personal FB profile — admins
    // need the link on file to check the posts actually went up.
    fbProfileLink: text("fb_profile_link"),
    payType: payTypeEnum("pay_type").default("per_job"),
    payRate: numeric("pay_rate", { precision: 10, scale: 2 }),
    needCheckin: boolean("need_checkin").notNull().default(true),
    // Photos required to mark a no-checkin job "done" (0 = none required).
    // Matches the legacy system exactly — this was always a count, not a flag.
    donePhotos: integer("done_photos").notNull().default(0),
    // Bumped by a periodic client heartbeat while the app is open — "online"
    // in chat is just "seen in the last minute", no websocket/session tracking.
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("users_role_idx").on(t.role),
    index("users_supervisor_idx").on(t.supervisorId),
  ],
);

export const jobTypes = pgTable("job_types", {
  id: uuid("id").primaryKey().defaultRandom(),
  typeName: text("type_name").notNull().unique(),
  pay: numeric("pay", { precision: 10, scale: 2 }).notNull(),
  active: boolean("active").notNull().default(true),
});

export const units = pgTable("units", {
  id: uuid("id").primaryKey().defaultRandom(),
  unitCode: varchar("unit_code", { length: 30 }).notNull().unique(),
  unitName: text("unit_name").notNull(),
  property: text("property"),
  address: text("address"),
  lat: doublePrecision("lat").notNull().default(0),
  lon: doublePrecision("lon").notNull().default(0),
  radiusM: integer("radius_m").notNull().default(200),
});

export const payroll = pgTable(
  "payroll",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    payrollCode: varchar("payroll_code", { length: 20 }).notNull().unique(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    month: date("month"),
    jobsCount: integer("jobs_count").notNull().default(0),
    jobsPay: numeric("jobs_pay", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    baseSalary: numeric("base_salary", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    allowance: numeric("allowance", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    deduction: numeric("deduction", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    note: text("note"),
    status: payrollStatusEnum("status").notNull().default("draft"),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    periodType: periodTypeEnum("period_type").notNull().default("custom"),
    pdfUrl: text("pdf_url"),
  },
  (t) => [
    index("payroll_user_month_idx").on(t.userId, t.month),
    index("payroll_status_idx").on(t.status),
  ],
);

// net = jobsPay + baseSalary + allowance - deduction, computed in application code
// (kept out of the DB as a generated column so admins can freely edit inputs and
// see net recompute without a migration if a new pay component is added later).

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobCode: varchar("job_code", { length: 40 }).notNull().unique(),
    title: text("title").notNull(),
    description: text("description"),
    property: text("property"),
    unitId: uuid("unit_id").references(() => units.id, {
      onDelete: "set null",
    }),
    assignedTo: uuid("assigned_to").references(() => users.id, {
      onDelete: "set null",
    }),
    assignedBy: uuid("assigned_by").references(() => users.id, {
      onDelete: "set null",
    }),
    schedDate: date("sched_date").notNull(),
    startTime: time("start_time"),
    endTime: time("end_time"),
    status: jobStatusEnum("status").notNull().default("assigned"),
    checkInTime: timestamp("check_in_time", { withTimezone: true }),
    checkInLat: doublePrecision("check_in_lat"),
    checkInLon: doublePrecision("check_in_lon"),
    checkInDist: doublePrecision("check_in_dist"),
    checkOutTime: timestamp("check_out_time", { withTimezone: true }),
    checkOutLat: doublePrecision("check_out_lat"),
    checkOutLon: doublePrecision("check_out_lon"),
    checkOutDist: doublePrecision("check_out_dist"),
    // Replaces the 15 fixed Photo1-5/Before1-5/After1-5 columns from the old
    // sheet with an open-ended list: [{ url, kind: 'photo'|'before'|'after', idx }]
    photos: jsonb("photos").notNull().default(sql`'[]'::jsonb`),
    notes: text("notes"),
    pay: numeric("pay", { precision: 10, scale: 2 }).notNull().default("0"),
    jobTypeId: uuid("job_type_id").references(() => jobTypes.id, {
      onDelete: "set null",
    }),
    payrollId: uuid("payroll_id").references(() => payroll.id, {
      onDelete: "set null",
    }),
    paidDate: date("paid_date"),
    reopened: boolean("reopened").notNull().default(false),
    reminderSent: boolean("reminder_sent").notNull().default(false),
    startReminded: boolean("start_reminded").notNull().default(false),
    advanceReminded: boolean("advance_reminded").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("jobs_assigned_sched_idx").on(t.assignedTo, t.schedDate),
    index("jobs_status_idx").on(t.status),
    index("jobs_payroll_idx").on(t.payrollId),
  ],
);

export const leaves = pgTable(
  "leaves",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leaveCode: varchar("leave_code", { length: 20 }).notNull().unique(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 50 }).notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    days: numeric("days", { precision: 5, scale: 1 }).notNull(),
    reason: text("reason"),
    status: leaveStatusEnum("status").notNull().default("pending"),
    reviewedBy: uuid("reviewed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    reviewNote: text("review_note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("leaves_user_status_idx").on(t.userId, t.status)],
);

export const chatGroups = pgTable("chat_groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const chatGroupMembers = pgTable(
  "chat_group_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => chatGroups.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    // Bumped whenever this member fetches the group's messages — unread
    // count for the group is just "messages newer than this, not sent by me".
    lastReadAt: timestamp("last_read_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    // Set when this member clears the chat (WhatsApp-style — local to them
    // only). Messages at/before this point are hidden from their view;
    // other members still see full history.
    clearedAt: timestamp("cleared_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("chat_group_members_group_user_idx").on(t.groupId, t.userId)],
);

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => chatGroups.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    attachmentUrl: text("attachment_url"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("chat_messages_group_created_idx").on(t.groupId, t.createdAt)],
);

export const chatGroupsRelations = relations(chatGroups, ({ many, one }) => ({
  members: many(chatGroupMembers),
  messages: many(chatMessages),
  creator: one(users, { fields: [chatGroups.createdBy], references: [users.id] }),
}));

export const chatGroupMembersRelations = relations(chatGroupMembers, ({ one }) => ({
  group: one(chatGroups, { fields: [chatGroupMembers.groupId], references: [chatGroups.id] }),
  user: one(users, { fields: [chatGroupMembers.userId], references: [users.id] }),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  group: one(chatGroups, { fields: [chatMessages.groupId], references: [chatGroups.id] }),
  sender: one(users, { fields: [chatMessages.senderId], references: [users.id] }),
}));

export const usersRelations = relations(users, ({ many, one }) => ({
  jobsAssigned: many(jobs, { relationName: "assignedTo" }),
  payrolls: many(payroll),
  leaves: many(leaves),
  supervisor: one(users, {
    fields: [users.supervisorId],
    references: [users.id],
  }),
}));

export const jobsRelations = relations(jobs, ({ one }) => ({
  unit: one(units, { fields: [jobs.unitId], references: [units.id] }),
  assignee: one(users, {
    fields: [jobs.assignedTo],
    references: [users.id],
    relationName: "assignedTo",
  }),
  assigner: one(users, {
    fields: [jobs.assignedBy],
    references: [users.id],
  }),
  jobType: one(jobTypes, {
    fields: [jobs.jobTypeId],
    references: [jobTypes.id],
  }),
  payrollEntry: one(payroll, {
    fields: [jobs.payrollId],
    references: [payroll.id],
  }),
}));

export const payrollRelations = relations(payroll, ({ one, many }) => ({
  user: one(users, { fields: [payroll.userId], references: [users.id] }),
  createdByUser: one(users, {
    fields: [payroll.createdBy],
    references: [users.id],
  }),
  jobs: many(jobs),
}));

export const leavesRelations = relations(leaves, ({ one }) => ({
  user: one(users, { fields: [leaves.userId], references: [users.id] }),
  reviewer: one(users, {
    fields: [leaves.reviewedBy],
    references: [users.id],
  }),
}));
