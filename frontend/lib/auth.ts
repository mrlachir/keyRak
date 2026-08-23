import type { NextAuthOptions, Profile } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

import { resolveBackendRole, signBackendToken } from "@/lib/backend-token";
import { requireServerEnv } from "@/lib/env";
import type { UserRole } from "@/types";

interface GoogleProfile extends Profile {
  email_verified?: boolean;
}

export const authOptions: NextAuthOptions = {
  secret: requireServerEnv("NEXTAUTH_SECRET"),
  providers: [
    GoogleProvider({
      clientId: requireServerEnv("GOOGLE_CLIENT_ID"),
      clientSecret: requireServerEnv("GOOGLE_CLIENT_SECRET"),
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account?.provider === "google") {
        token.googleSubject = account.providerAccountId;
        token.emailVerified = (profile as GoogleProfile | undefined)?.email_verified ?? false;
        token.role = "CLIENT";
        token.backendAccessToken = undefined;
        token.backendAccessTokenExpiresAt = undefined;
      }

      const subject = token.googleSubject ?? token.sub;
      if (!subject || !token.email) {
        return token;
      }

      const now = Math.floor(Date.now() / 1000);
      if (
        token.backendAccessToken &&
        token.backendAccessTokenExpiresAt &&
        token.backendAccessTokenExpiresAt > now + 60
      ) {
        return token;
      }

      const currentRole: UserRole = token.role ?? "CLIENT";
      const identity = {
        subject,
        email: token.email,
        name: token.name,
        picture: token.picture,
        emailVerified: token.emailVerified,
        role: currentRole,
      };
      const bootstrapToken = await signBackendToken(identity);
      const resolvedRole = await resolveBackendRole(bootstrapToken.value, currentRole);
      const accessToken =
        resolvedRole === currentRole
          ? bootstrapToken
          : await signBackendToken({ ...identity, role: resolvedRole });

      token.role = resolvedRole;
      token.backendAccessToken = accessToken.value;
      token.backendAccessTokenExpiresAt = accessToken.expiresAt;
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.googleSubject ?? token.sub ?? "";
        session.user.role = token.role ?? "CLIENT";
      }
      session.accessToken = token.backendAccessToken ?? "";
      session.accessTokenExpiresAt = token.backendAccessTokenExpiresAt ?? 0;
      return session;
    },
  },
};
