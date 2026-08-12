import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { payroll } from "@/db/schema";
import { generateAndStorePayslipPdf } from "@/lib/payroll-pdf";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const [existing] = await db.select().from(payroll).where(eq(payroll.id, id)).limit(1);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isAdmin = ["boss", "admin", "supervisor"].includes(session.user.role);
  const isOwner = existing.userId === session.user.id;
  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await generateAndStorePayslipPdf(id);
  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // ?download=1 forces a file download instead of opening inline in the
  // browser's PDF viewer — Vercel Blob honors a `download` query param on
  // the blob URL itself by setting Content-Disposition: attachment.
  const wantsDownload = new URL(request.url).searchParams.has("download");
  const target = wantsDownload
    ? `${result.blobUrl}?download=${encodeURIComponent(`${result.payroll.payrollCode}.pdf`)}`
    : result.blobUrl;

  return NextResponse.redirect(target);
}
