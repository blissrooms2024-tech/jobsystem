import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { payroll } from "@/db/schema";
import { generateAndStorePayslipPdf } from "@/lib/payroll-pdf";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
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

  const isAdmin = ["boss", "admin"].includes(session.user.role);
  const isOwner = existing.userId === session.user.id;
  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await generateAndStorePayslipPdf(id);
  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Streams the PDF bytes directly for download — the project's Blob store
  // is private, so its URL isn't fetchable by the browser without a signed
  // request. Viewing happens via the in-app payslip preview instead, so
  // this route's only job now is producing the downloadable file.
  return new NextResponse(new Uint8Array(result.pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${result.payroll.payrollCode}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
