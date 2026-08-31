import "server-only";

import { SignJWT } from "jose";

import { backendApiUrl, requireServerEnv } from "@/lib/env";
import type { UserProfileResponse, UserRole } from "@/types";

const ACCESS_TOKEN_LIFETIME_SECONDS = 15 * 60;

export interface BackendIdentity {
  subject: string;
  email: string;
  name?: string | null;
  picture?: string | null;
  emailVerified?: boolean;
  role: UserRole;
  authTime?: number;
}

export interface SignedBackendToken {
  value: string;
  expiresAt: number;
}

export async function signBackendToken(identity: BackendIdentity): Promise<SignedBackendToken> {
  const secretValue = requireServerEnv("JWT_SECRET");
  const secret = new TextEncoder().encode(secretValue);
  if (secret.byteLength < 32) {
    throw new Error("JWT_SECRET must contain at least 32 bytes for HS256");
  }

  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + ACCESS_TOKEN_LIFETIME_SECONDS;
  const jwt = await new SignJWT({
    email: identity.email,
    name: identity.name ?? undefined,
    picture: identity.picture ?? undefined,
    email_verified: identity.emailVerified ?? false,
    roles: [identity.role],
    auth_time: identity.authTime ?? 0,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(identity.subject)
    .setIssuer(process.env.JWT_ISSUER ?? "keyrak-nextauth")
    .setAudience(process.env.JWT_AUDIENCE ?? "keyrak-api")
    .setIssuedAt(issuedAt)
    .setExpirationTime(expiresAt)
    .setJti(crypto.randomUUID())
    .sign(secret);

  return { value: jwt, expiresAt };
}

export async function resolveBackendRole(
  token: string,
  fallbackRole: UserRole,
): Promise<UserRole> {
  try {
    const response = await fetch(`${backendApiUrl()}/api/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) {
      return fallbackRole;
    }
    const profile = (await response.json()) as UserProfileResponse;
    return profile.role;
  } catch {
    return fallbackRole;
  }
}
