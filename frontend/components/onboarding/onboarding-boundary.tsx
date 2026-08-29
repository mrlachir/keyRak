import { getServerSession } from "next-auth";
import type { ReactNode } from "react";

import { OnboardingModal } from "@/components/onboarding/onboarding-modal";
import { apiFetch } from "@/lib/api";
import { authOptions } from "@/lib/auth";
import type { UserProfileResponse } from "@/types";

export async function OnboardingBoundary({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return children;

  let profile: UserProfileResponse | null = null;
  let onboardingState: "complete" | "incomplete" | "error" = "complete";

  try {
    profile = await apiFetch<UserProfileResponse>("/api/users/me");
    onboardingState = profile.displayName?.trim() && profile.telephone?.trim()
      ? "complete"
      : "incomplete";
  } catch {
    onboardingState = "error";
  }

  return (
    <>
      {children}
      {onboardingState === "error" ? (
        <OnboardingModal verificationError />
      ) : onboardingState === "incomplete" && profile ? (
        <OnboardingModal
          initialFullName={profile.displayName ?? session.user.name ?? ""}
          initialTelephone={profile.telephone ?? ""}
        />
      ) : null}
    </>
  );
}
