import { NextResponse, type NextRequest } from "next/server";

export const config = {
  matcher: ["/app/:path*"]
};

export function proxy(request: NextRequest) {
  // UX-only redirect optimization. Authorization still happens in protected pages
  // and server actions through requireVerifiedSession().
  if (!hasQueueSessionCookie(request)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("estado", "credenciais-invalidas");
    loginUrl.searchParams.set("next", request.nextUrl.pathname);

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

function hasQueueSessionCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some(({ name }) => {
    const normalizedName = name.toLowerCase();
    return normalizedName.includes("queue2") && normalizedName.includes("session");
  });
}
