import { NextResponse, type NextRequest } from "next/server";
import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

type SessionData = {
  userId?: string;
  email?: string;
  role?: string;
};

function getSessionOptions(): SessionOptions {
  return {
    cookieName: "magic_session",
    password: process.env.SESSION_SECRET || "",
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.COOKIE_SECURE === "true",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    },
  };
}

export default async function proxy(req: NextRequest) {
  const url = req.nextUrl;
  const path = url.pathname;

  const needsAuth = path.startsWith("/editor");
  const isLogin = path === "/login";

  if (!needsAuth && !isLogin) {
    return NextResponse.next();
  }

  // Without a usable secret there is no session to check — and letting the
  // request through means /editor renders to anyone who asks. It used to do
  // exactly that, silently. It is not a theoretical state either: a
  // hand-written .env, a Kubernetes manifest whose placeholder was never
  // replaced, or any install that did not go through deploy/install.sh can
  // land here.
  //
  // Refuse instead, and say why. The pages behind this are useless without a
  // secret anyway — getSessionSecret() throws in every guarded API route — so
  // the choice is between an editor that half-works in silence and one that
  // states its problem. Public /view displays are untouched: they never reach
  // this branch (see `needsAuth` above), so a broken .env costs you the editor,
  // not the screen on the kitchen wall.
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    return new NextResponse(
      "Magic Frame is not configured: SESSION_SECRET is missing or shorter than 32 characters.\n\n" +
        "Nobody can sign in until it is set, so the editor is closed rather than left open.\n\n" +
        "Generate one:\n\n" +
        "  openssl rand -hex 32\n\n" +
        "Then put it where your install keeps it, and restart:\n\n" +
        "  Docker Compose   SESSION_SECRET in the .env next to docker-compose.yml\n" +
        "                   (re-running deploy/install.sh also does this for you)\n" +
        "  Kubernetes       the SESSION_SECRET key in the Secret — not the ConfigMap\n" +
        "                   (Helm: appConfig.sessionSecret)\n" +
        "  Home Assistant   generated for you; you should never see this page\n\n" +
        "Your views keep running — this only affects /editor and /login.\n",
      { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }

  const session = await getIronSession<SessionData>(
    await cookies(),
    getSessionOptions(),
  );

  if (needsAuth && !session.userId) {
    const loginUrl = new URL("/login", url);
    loginUrl.searchParams.set("next", path + url.search);
    return NextResponse.redirect(loginUrl);
  }

  if (isLogin && session.userId) {
    return NextResponse.redirect(new URL("/editor", url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/editor/:path*", "/login"],
};
