export function appUrl() {
  return process.env.APP_URL?.replace(/\/$/, "") ?? "";
}
