import "server-only";
import { NextResponse } from "next/server";
import { getSession, type SessionData } from "./session";

export async function verifySession(): Promise<SessionData> {
  const session = await getSession();
  if (!session.userId) {
    throw new UnauthorizedError();
  }
  return session;
}

/**
 * Like verifySession, but the account must be an admin.
 *
 * Roles existed from the first release — every session carries one and the
 * column defaults to "admin" — but only four routes ever checked it. A
 * "viewer" could change the brute-force limits, set the domain and TLS
 * configuration, restore a backup over the whole installation, and upload a
 * custom module. That last one is the one that matters: a module is JavaScript
 * that afterwards runs on every display in the house.
 *
 * Existing installs are unaffected: single-user setups are admin by default,
 * so nobody loses access to anything they could reach yesterday.
 */
export async function verifyAdmin(): Promise<SessionData> {
  const session = await verifySession();
  if (session.role !== "admin") {
    throw new ForbiddenError();
  }
  return session;
}

export class ForbiddenError extends Error {
  constructor() {
    super("Forbidden");
    this.name = "ForbiddenError";
  }
}

export function forbiddenResponse() {
  return NextResponse.json(
    { error: "This needs an administrator account." },
    { status: 403 },
  );
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function withAuth<T>(
  handler: (session: SessionData) => Promise<T> | T,
): Promise<T | NextResponse> {
  try {
    const session = await verifySession();
    return await handler(session);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return unauthorizedResponse();
    }
    throw err;
  }
}
