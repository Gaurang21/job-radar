import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes that require authentication
const PROTECTED_PREFIXES = ["/dashboard", "/jobs", "/pipeline", "/profile", "/settings", "/linkedin-analyzer", "/ats-checker"];
// Routes that are auth-only (redirect to dashboard if signed in)
const AUTH_PAGES = ["/login", "/signup", "/forgot-password"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase isn't configured, don't crash the whole site. Let the request
  // through — protected pages still enforce auth via requireUser() server-side.
  if (!supabaseUrl || !supabaseKey) {
    console.error(
      "[middleware] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY — skipping auth check."
    );
    return response;
  }

  try {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });

    const { data: { user } } = await supabase.auth.getUser();
    const path = request.nextUrl.pathname;

    const isProtected = PROTECTED_PREFIXES.some((p) => path.startsWith(p));
    const isAuthPage = AUTH_PAGES.some((p) => path === p);

    if (isProtected && !user) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set("next", path);
      return NextResponse.redirect(redirectUrl);
    }

    if (isAuthPage && user) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/dashboard";
      return NextResponse.redirect(redirectUrl);
    }

    return response;
  } catch (err) {
    // Never let a transient Supabase/network error turn into a site-wide 500.
    // Server-side requireUser() remains the source of truth for protected routes.
    console.error("[middleware] Auth check failed:", err);
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image, favicon, public assets
     * - api/extension/* (uses bearer token instead of cookies)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/extension|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
