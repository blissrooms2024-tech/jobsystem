/** Fixed inbox for admin nudges (new signups, leave requests, payroll
 * cutoff reminders, auto-deactivations) — sending here directly means
 * these never silently go nowhere if a boss/admin user record happens to
 * have no email on file. */
export const ADMIN_NOTIFY_EMAIL = "blissrooms2024@gmail.com";
