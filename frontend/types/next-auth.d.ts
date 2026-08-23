import type { DefaultSession } from "next-auth";

import type { UserRole } from "@/types";

declare module "next-auth" {
  interface Session {
    accessToken: string;
    accessTokenExpiresAt: number;
    user: {
      id: string;
      role: UserRole;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    googleSubject?: string;
    emailVerified?: boolean;
    role?: UserRole;
    backendAccessToken?: string;
    backendAccessTokenExpiresAt?: number;
  }
}
