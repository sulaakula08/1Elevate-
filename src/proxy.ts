import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Keeps the signed-in student signed in.
 *
 * An access token is good for an hour. The browser can refresh it by itself,
 * but only while the tab is open — someone who closes the laptop on Friday and
 * opens it on Monday comes back with an expired token and a refresh that has to
 * happen before anything renders. That gap is what made the app ask for a
 * password again on a session that was never actually over.
 *
 * Running the refresh here moves it in front of the page: by the time the first
 * component runs, the cookie holds a fresh token. It also means the cookie is
 * re-issued by the server on every visit, which is what keeps it out of
 * Safari's seven-day cap on storage written by script.
 *
 * `getUser` rather than `getSession` on purpose. getSession reads the cookie and
 * believes it; getUser asks the auth server, which is the call that performs the
 * refresh and the only one whose answer cannot be forged by editing a cookie.
 * Nothing here is authorisation — the API routes still check the token
 * themselves — so a failure is not worth blocking a page over.
 */

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function proxy(request: NextRequest) {
  // The response has to exist before the client does: a refresh writes new
  // cookies through setAll, and they need somewhere to be written.
  const response = NextResponse.next({ request });
  if (!URL || !ANON_KEY) return response;

  const client = createServerClient(URL, ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies, headers) => {
        for (const { name, value, options } of cookies) {
          // Both, and in this order. The request copy is what a route handler
          // rendered in this same pass will read; the response copy is what the
          // browser keeps for next time. Setting only one gives a page that is
          // signed in now and signed out on reload, or the reverse.
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        }
        // A response carrying somebody's session token must never be held by a
        // CDN — the next visitor would be served it. The library hands us the
        // headers that say so rather than leaving us to remember them.
        for (const [key, value] of Object.entries(headers)) {
          response.headers.set(key, value);
        }
      },
    },
  });

  try {
    await client.auth.getUser();
  } catch {
    // Auth server unreachable. The existing cookie is untouched and the page
    // renders; a student offline on a train keeps their session.
  }

  return response;
}

export const config = {
  // Everything a person navigates to, and nothing else. Static assets and image
  // optimisation carry no session and would only add a round trip to the auth
  // server per file. API routes are excluded too: they authenticate from the
  // Authorization header the browser attaches, so a refresh here would be work
  // nobody reads.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
