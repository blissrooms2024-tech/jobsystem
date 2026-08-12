/**
 * One-time migration: reads the legacy BLISS_ROOMS_JOB_SYSTEM.xlsx (the
 * Google Sheets export from the Apps Script system) and loads it into Neon.
 *
 * Usage:
 *   npm run migrate:xlsx -- /path/to/BLISS_ROOMS_JOB_SYSTEM.xlsx
 *
 * Requires DATABASE_URL in .env.local (see .env.local.example). Safe to
 * re-run: every insert is keyed on the legacy code column and upserts.
 *
 * NOTE: this script depends on the `xlsx` (SheetJS) package, which has a
 * known prototype-pollution/ReDoS advisory with no fix released. That's
 * acceptable here because it only ever runs locally, once, against a file
 * you supply yourself — it is not part of the deployed app and never
 * touches untrusted input.
 */
import "dotenv/config";
import { readFileSync } from "fs";
import { resolve } from "path";
import * as XLSX from "xlsx";
import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import { jobTypes, jobs, leaves, payroll, units, users } from "../src/db/schema";
import type * as schema from "../src/db/schema";
import type { PhotoEntry } from "../src/lib/photos";

type Db = NeonHttpDatabase<typeof schema>;

function loadWorkbook(filePath: string) {
  const buf = readFileSync(filePath);
  return XLSX.read(buf, { type: "buffer", cellDates: true });
}

function sheetRows<T = Record<string, unknown>>(wb: XLSX.WorkBook, name: string): T[] {
  const sheet = wb.Sheets[name];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<T>(sheet, { defval: null, raw: true });
}

function toDateString(value: unknown): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value as string);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function toTimeString(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    return `${String(value.getUTCHours()).padStart(2, "0")}:${String(value.getUTCMinutes()).padStart(2, "0")}`;
  }
  return null;
}

function money(value: unknown): string {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? 0));
  return (Number.isFinite(n) ? n : 0).toFixed(2);
}

const ROLE_MAP: Record<string, "boss" | "admin" | "supervisor" | "employee"> = {
  Boss: "boss",
  Admin: "admin",
  Supervisor: "supervisor",
  Employee: "employee",
};
const STATUS_MAP: Record<string, "assigned" | "in_progress" | "completed" | "cancelled" | "missed"> = {
  Assigned: "assigned",
  "In Progress": "in_progress",
  Completed: "completed",
  Cancelled: "cancelled",
  Missed: "missed",
};
const PAYROLL_STATUS_MAP: Record<string, "draft" | "paid"> = {
  Draft: "draft",
  Paid: "paid",
};
const PERIOD_TYPE_MAP: Record<string, "custom" | "month"> = {
  Custom: "custom",
  Month: "month",
};

export async function runMigration(db: Db, filePath: string) {
  const wb = loadWorkbook(resolve(filePath));

  const report: Record<string, { source: number; upserted: number }> = {};

  // --- Users (two passes: insert, then wire up supervisorId) ---
  const userRows = sheetRows<Record<string, unknown>>(wb, "Users");
  const userCodeToId = new Map<string, string>();
  const userCodeToSupervisorCode = new Map<string, string>();
  const userNameToId = new Map<string, string>();

  for (const row of userRows) {
    const userCode = String(row.UserID);
    const plaintextPassword = String(row.Password ?? "changeme");
    const passwordHash = await bcrypt.hash(plaintextPassword, 12);

    const [existing] = await db.select().from(users).where(eq(users.userCode, userCode)).limit(1);
    const values = {
      userCode,
      name: String(row.Name),
      username: String(row.Username),
      passwordHash,
      mustChangePassword: true,
      role: ROLE_MAP[String(row.Role)] ?? "employee",
      phone: row.Phone != null ? String(row.Phone) : null,
      active: Boolean(row.Active),
      staffType: row.StaffType != null ? String(row.StaffType) : null,
      icPassport: row.IcPassport != null ? String(row.IcPassport) : null,
      address: row.Address != null ? String(row.Address) : null,
      email: row.Email != null ? String(row.Email) : null,
      emergencyContact: row.Emergency != null ? String(row.Emergency) : null,
      bankName: row.BankName != null ? String(row.BankName) : null,
      bankAccount: row.BankAccount != null ? String(row.BankAccount) : null,
      payType: row.PayType === "PerJob" ? ("per_job" as const) : ("base" as const),
      payRate: row.PayRate != null ? money(row.PayRate) : null,
      needCheckin: row.NeedCheckin == null ? true : Boolean(row.NeedCheckin),
      donePhotos: Number(row.DonePhotos) || 0,
    };

    let id: string;
    if (existing) {
      await db.update(users).set(values).where(eq(users.id, existing.id));
      id = existing.id;
    } else {
      const [created] = await db.insert(users).values(values).returning({ id: users.id });
      id = created.id;
    }
    userCodeToId.set(userCode, id);
    userNameToId.set(values.name, id);
    if (row.SupervisorID) userCodeToSupervisorCode.set(userCode, String(row.SupervisorID));
  }
  for (const [userCode, supervisorCode] of userCodeToSupervisorCode) {
    const supervisorId = userCodeToId.get(supervisorCode);
    const userId = userCodeToId.get(userCode);
    if (supervisorId && userId) {
      await db.update(users).set({ supervisorId }).where(eq(users.id, userId));
    }
  }
  report.users = { source: userRows.length, upserted: userCodeToId.size };

  // --- JobTypes ---
  const jobTypeRows = sheetRows<Record<string, unknown>>(wb, "JobTypes");
  const jobTypeNameToId = new Map<string, string>();
  for (const row of jobTypeRows) {
    const typeName = String(row.TypeName);
    const [existing] = await db.select().from(jobTypes).where(eq(jobTypes.typeName, typeName)).limit(1);
    const values = { typeName, pay: money(row.Pay), active: Boolean(row.Active) };
    let id: string;
    if (existing) {
      await db.update(jobTypes).set(values).where(eq(jobTypes.id, existing.id));
      id = existing.id;
    } else {
      const [created] = await db.insert(jobTypes).values(values).returning({ id: jobTypes.id });
      id = created.id;
    }
    jobTypeNameToId.set(typeName, id);
  }
  report.jobTypes = { source: jobTypeRows.length, upserted: jobTypeNameToId.size };

  // --- Units ---
  const unitRows = sheetRows<Record<string, unknown>>(wb, "Units");
  const unitCodeToId = new Map<string, string>();
  for (const row of unitRows) {
    const unitCode = String(row.UnitCode);
    const [existing] = await db.select().from(units).where(eq(units.unitCode, unitCode)).limit(1);
    const values = {
      unitCode,
      unitName: String(row.UnitName),
      property: row.Property != null ? String(row.Property) : null,
      address: row.Address != null ? String(row.Address) : null,
      lat: Number(row.Lat ?? 0),
      lon: Number(row.Lon ?? 0),
      radiusM: Number(row.Radius ?? 200),
    };
    let id: string;
    if (existing) {
      await db.update(units).set(values).where(eq(units.id, existing.id));
      id = existing.id;
    } else {
      const [created] = await db.insert(units).values(values).returning({ id: units.id });
      id = created.id;
    }
    unitCodeToId.set(unitCode, id);
  }
  report.units = { source: unitRows.length, upserted: unitCodeToId.size };

  // --- Payroll (before Jobs, so jobs can link payrollId) ---
  const payrollRows = sheetRows<Record<string, unknown>>(wb, "Payroll");
  const usernameToUserId = new Map<string, string>();
  for (const row of userRows) {
    const id = userCodeToId.get(String(row.UserID));
    if (id) usernameToUserId.set(String(row.Username), id);
  }
  const payrollCodeToId = new Map<string, string>();
  for (const row of payrollRows) {
    const payrollCode = String(row.PayrollID);
    const userId = usernameToUserId.get(String(row.Username));
    if (!userId) {
      console.warn(`Skipping payroll ${payrollCode}: unknown username ${row.Username}`);
      continue;
    }
    const createdByName = row.CreatedBy != null ? String(row.CreatedBy) : null;
    const [existing] = await db.select().from(payroll).where(eq(payroll.payrollCode, payrollCode)).limit(1);
    const values = {
      payrollCode,
      userId,
      month: toDateString(row.Month),
      jobsCount: Number(row.JobsCount ?? 0),
      jobsPay: money(row.JobsPay),
      baseSalary: money(row.BaseSalary),
      allowance: money(row.Allowance),
      deduction: money(row.Deduction),
      note: row.Note != null ? String(row.Note) : null,
      status: PAYROLL_STATUS_MAP[String(row.Status)] ?? "draft",
      createdBy: createdByName ? (userNameToId.get(createdByName) ?? null) : null,
      paidAt: row.PaidAt instanceof Date ? row.PaidAt : null,
      periodStart: toDateString(row.PeriodStart) ?? toDateString(row.Month) ?? "2026-01-01",
      periodEnd: toDateString(row.PeriodEnd) ?? toDateString(row.Month) ?? "2026-01-01",
      periodType: PERIOD_TYPE_MAP[String(row.PeriodType)] ?? "custom",
      pdfUrl: row.PdfUrl != null ? String(row.PdfUrl) : null,
    };
    let id: string;
    if (existing) {
      await db.update(payroll).set(values).where(eq(payroll.id, existing.id));
      id = existing.id;
    } else {
      const [created] = await db.insert(payroll).values(values).returning({ id: payroll.id });
      id = created.id;
    }
    payrollCodeToId.set(payrollCode, id);
  }
  report.payroll = { source: payrollRows.length, upserted: payrollCodeToId.size };

  // --- Jobs ---
  const jobRows = sheetRows<Record<string, unknown>>(wb, "Jobs");
  let jobsUpserted = 0;
  for (const row of jobRows) {
    const jobCode = String(row.JobID);
    const photos: PhotoEntry[] = [];
    (["Photo1", "Photo2", "Photo3", "Photo4", "Photo5"] as const).forEach((key, i) => {
      if (row[key]) photos.push({ url: String(row[key]), kind: "photo", idx: i });
    });
    (["Before1", "Before2", "Before3", "Before4", "Before5"] as const).forEach((key, i) => {
      if (row[key]) photos.push({ url: String(row[key]), kind: "before", idx: i });
    });
    (["After1", "After2", "After3", "After4", "After5"] as const).forEach((key, i) => {
      if (row[key]) photos.push({ url: String(row[key]), kind: "after", idx: i });
    });

    const assignedToId = row.AssignedTo ? usernameToUserId.get(String(row.AssignedTo)) : undefined;
    const assignedByName = row.AssignedByName != null ? String(row.AssignedByName) : null;

    const [existing] = await db.select().from(jobs).where(eq(jobs.jobCode, jobCode)).limit(1);
    const values = {
      jobCode,
      title: String(row.Title ?? "Untitled"),
      description: row.Description != null ? String(row.Description) : null,
      property: row.Property != null ? String(row.Property) : null,
      unitId: row.UnitCode ? (unitCodeToId.get(String(row.UnitCode)) ?? null) : null,
      assignedTo: assignedToId ?? null,
      assignedBy: assignedByName ? (userNameToId.get(assignedByName) ?? null) : null,
      schedDate: toDateString(row.SchedDate) ?? "2026-01-01",
      startTime: toTimeString(row.StartTime),
      endTime: toTimeString(row.EndTime),
      status: STATUS_MAP[String(row.Status)] ?? "assigned",
      checkInTime: row.CheckInTime instanceof Date ? row.CheckInTime : null,
      checkInLat: row.CheckInLat != null ? Number(row.CheckInLat) : null,
      checkInLon: row.CheckInLon != null ? Number(row.CheckInLon) : null,
      checkInDist: row.CheckInDist != null ? Number(row.CheckInDist) : null,
      checkOutTime: row.CheckOutTime instanceof Date ? row.CheckOutTime : null,
      checkOutLat: row.CheckOutLat != null ? Number(row.CheckOutLat) : null,
      checkOutLon: row.CheckOutLon != null ? Number(row.CheckOutLon) : null,
      checkOutDist: row.CheckOutDist != null ? Number(row.CheckOutDist) : null,
      photos,
      notes: row.Notes != null ? String(row.Notes) : null,
      pay: money(row.Pay),
      jobTypeId: row.JobType ? (jobTypeNameToId.get(String(row.JobType)) ?? null) : null,
      payrollId: row.PayrollID ? (payrollCodeToId.get(String(row.PayrollID)) ?? null) : null,
      paidDate: toDateString(row.PaidDate),
      reopened: Boolean(row.Reopened),
      reminderSent: Boolean(row.ReminderSent),
      startReminded: Boolean(row.StartReminded),
      advanceReminded: Boolean(row.AdvanceReminded),
    };

    if (existing) {
      await db.update(jobs).set(values).where(eq(jobs.id, existing.id));
    } else {
      await db.insert(jobs).values(values);
    }
    jobsUpserted++;
  }
  report.jobs = { source: jobRows.length, upserted: jobsUpserted };

  // --- Leaves ---
  const leaveRows = sheetRows<Record<string, unknown>>(wb, "Leaves");
  let leavesUpserted = 0;
  for (const row of leaveRows) {
    if (!row.LeaveID) continue;
    const leaveCode = String(row.LeaveID);
    const userId = row.Username ? usernameToUserId.get(String(row.Username)) : undefined;
    if (!userId) {
      console.warn(`Skipping leave ${leaveCode}: unknown username ${row.Username}`);
      continue;
    }
    const [existing] = await db.select().from(leaves).where(eq(leaves.leaveCode, leaveCode)).limit(1);
    const values = {
      leaveCode,
      userId,
      type: String(row.Type ?? "Other"),
      startDate: toDateString(row.StartDate) ?? "2026-01-01",
      endDate: toDateString(row.EndDate) ?? "2026-01-01",
      days: String(row.Days ?? "1"),
      reason: row.Reason != null ? String(row.Reason) : null,
      status: (["pending", "approved", "rejected"] as const).includes(
        String(row.Status).toLowerCase() as "pending",
      )
        ? (String(row.Status).toLowerCase() as "pending" | "approved" | "rejected")
        : "pending",
      reviewedBy: row.ReviewedBy ? (userNameToId.get(String(row.ReviewedBy)) ?? null) : null,
      reviewNote: row.ReviewNote != null ? String(row.ReviewNote) : null,
    };
    if (existing) {
      await db.update(leaves).set(values).where(eq(leaves.id, existing.id));
    } else {
      await db.insert(leaves).values(values);
    }
    leavesUpserted++;
  }
  report.leaves = { source: leaveRows.length, upserted: leavesUpserted };

  console.log("\nMigration reconciliation report:");
  console.table(report);

  const countOf = async (table: typeof users | typeof jobs | typeof payroll | typeof jobTypes | typeof units | typeof leaves) => {
    const [row] = await db.select({ count: sql<number>`count(*)` }).from(table);
    return row?.count ?? 0;
  };
  console.log("\nRow counts now in Neon:", {
    users: await countOf(users),
    jobs: await countOf(jobs),
    payroll: await countOf(payroll),
    jobTypes: await countOf(jobTypes),
    units: await countOf(units),
    leaves: await countOf(leaves),
  });
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: npm run migrate:xlsx -- /path/to/BLISS_ROOMS_JOB_SYSTEM.xlsx");
    process.exit(1);
  }
  const { db } = await import("../src/db");
  await runMigration(db, filePath);
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
