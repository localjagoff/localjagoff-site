import { NextResponse } from "next/server";

function safeEqual(a, b) {
  const left = String(a || "");
  const right = String(b || "");

  if (!left || !right || left.length !== right.length) {
    return false;
  }

  let mismatch = 0;

  for (let i = 0; i < left.length; i += 1) {
    mismatch |= left.charCodeAt(i) ^ right.charCodeAt(i);
  }

  return mismatch === 0;
}

function unauthorized() {
  return new NextResponse("Admin login required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Local Jagoff Admin", charset="UTF-8"',
      "Cache-Control": "no-store",
    },
  });
}

export function middleware(request) {
  const username = process.env.PROMO_ADMIN_USERNAME || "";
  const password = process.env.PROMO_ADMIN_PASSWORD || "";

  if (!username || !password) {
    return new NextResponse(
      "Admin gate is not configured. Add PROMO_ADMIN_USERNAME and PROMO_ADMIN_PASSWORD in Vercel.",
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }

  const authHeader = request.headers.get("authorization") || "";

  if (!authHeader.startsWith("Basic ")) {
    return unauthorized();
  }

  let decoded = "";

  try {
    decoded = atob(authHeader.replace("Basic ", ""));
  } catch (err) {
    return unauthorized();
  }

  const separatorIndex = decoded.indexOf(":");

  if (separatorIndex < 0) {
    return unauthorized();
  }

  const suppliedUsername = decoded.slice(0, separatorIndex);
  const suppliedPassword = decoded.slice(separatorIndex + 1);

  if (!safeEqual(suppliedUsername, username) || !safeEqual(suppliedPassword, password)) {
    return unauthorized();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/promo-hub",
    "/admin/promo-hub/:path*",
    "/admin/promo-generator",
    "/admin/promo-generator/:path*",
    "/admin/promo-week-builder",
    "/admin/promo-week-builder/:path*",
    "/admin/promo-queue",
    "/admin/promo-queue/:path*",
    "/admin/promo-calendar",
    "/admin/promo-calendar/:path*",
    "/admin/promo-library",
    "/admin/promo-library/:path*",
    "/admin/promo-backup",
    "/admin/promo-backup/:path*",
  ],
};
