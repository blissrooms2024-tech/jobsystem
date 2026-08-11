function randomDigits(n: number) {
  return Math.floor(Math.random() * 10 ** n)
    .toString()
    .padStart(n, "0");
}

/** J20260707-8919 style code, matching the legacy sheet's job IDs. */
export function generateJobCode(schedDate: Date) {
  const y = schedDate.getFullYear();
  const m = String(schedDate.getMonth() + 1).padStart(2, "0");
  const d = String(schedDate.getDate()).padStart(2, "0");
  return `J${y}${m}${d}-${randomDigits(4)}`;
}

/** P0001 style sequential code. `nextSeq` is the next free integer sequence value. */
export function generatePayrollCode(nextSeq: number) {
  return `P${String(nextSeq).padStart(4, "0")}`;
}

/** L0001 style sequential code for leave requests. */
export function generateLeaveCode(nextSeq: number) {
  return `L${String(nextSeq).padStart(4, "0")}`;
}
