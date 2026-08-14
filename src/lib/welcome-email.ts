import { appUrl } from "@/lib/app-url";

/** Shared by admin-created accounts and approved self-signups. */
export function welcomeEmailHtml(name: string, username: string, tempPassword: string) {
  const link = appUrl() || "";
  return `
    <p>Hi ${name},</p>
    <p>An account has been created for you on the Bliss Rooms Job System.</p>
    <p>
      Username: <strong>${username}</strong><br />
      Temporary password: <strong>${tempPassword}</strong>
    </p>
    <p>You will be asked to set a new password the first time you log in.</p>
    ${link ? `<p><a href="${link}/login">Log in here</a></p>` : ""}
  `;
}
