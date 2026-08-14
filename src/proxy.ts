import { NextResponse } from "next/server";
import { auth } from "@/auth";

const ADMIN_ROLES = new Set(["boss", "admin"]);
const ADMIN_ONLY_PREFIXES = ["/users", "/units", "/job-types"];
const APPROVAL_ROLES = new Set(["boss", "admin", "supervisor"]);

const PUBLIC_PAGES = new Set(["/login", "/signup"]);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublicPage = PUBLIC_PAGES.has(pathname);
  const isAuthed = !!req.auth?.user;

  if (!isAuthed && !isPublicPage) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthed && isPublicPage) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }

  if (isAuthed) {
    const role = req.auth!.user.role;

    if (
      ADMIN_ONLY_PREFIXES.some((p) => pathname.startsWith(p)) &&
      !ADMIN_ROLES.has(role)
    ) {
      return NextResponse.redirect(new URL("/", req.nextUrl.origin));
    }

    if (
      pathname.startsWith("/leaves/approvals") &&
      !APPROVAL_ROLES.has(role)
    ) {
      return NextResponse.redirect(new URL("/", req.nextUrl.origin));
    }

    if (pathname.startsWith("/payroll") && (role === "employee" || role === "supervisor")) {
      // Employees and supervisors may only view their own payslips under
      // /payroll/me — full payroll administration is boss/admin only.
      if (!pathname.startsWith("/payroll/me")) {
        return NextResponse.redirect(new URL("/payroll/me", req.nextUrl.origin));
      }
    }
  }

  // Lets the dashboard layout (a Server Component) know which route it's
  // rendering for, so it can exempt /account from the forced-profile-
  // completion gate without needing its own client-side routing logic.
  const res = NextResponse.next();
  res.headers.set("x-pathname", pathname);
  return res;
});

// API routes are excluded here and instead check `auth()` themselves, returning
// JSON 401s — redirecting a fetch() call to an HTML login page is not useful to
// a client expecting JSON.
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
