import nodemailer from "nodemailer";

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (!transporter) {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;
    if (!user || !pass) {
      throw new Error("GMAIL_USER / GMAIL_APP_PASSWORD is not set");
    }
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
  }
  return transporter;
}

export async function sendMail(opts: { to: string; subject: string; html: string }) {
  const from = process.env.GMAIL_USER;
  await getTransporter().sendMail({
    from: `Bliss Rooms Job System <${from}>`,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
}
