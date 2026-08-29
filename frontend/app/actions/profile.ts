"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

import { apiErrorMessage, apiFetch } from "@/lib/api";
import { authOptions } from "@/lib/auth";
import type { ActionResult, UpdateUserProfileRequest, UserProfileResponse } from "@/types";

const telephonePattern = /^[+0-9() .-]{7,32}$/;

export async function updateProfileAction(
  input: UpdateUserProfileRequest,
): Promise<ActionResult<UserProfileResponse>> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { ok: false, message: "Sign in with Google to update your profile." };
  }

  const fullName = input.fullName.trim();
  const telephone = input.telephone.trim();
  const fieldErrors: Record<string, string> = {};

  if (!fullName || fullName.length > 150) {
    fieldErrors.fullName = "Enter your full name (up to 150 characters).";
  }
  if (!telephonePattern.test(telephone)) {
    fieldErrors.telephone = "Enter a valid telephone number using 7 to 32 characters.";
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: "Review your profile details.", fieldErrors };
  }

  try {
    const profile = await apiFetch<UserProfileResponse>("/api/users/me", {
      method: "PUT",
      body: JSON.stringify({ fullName, telephone }),
    });
    revalidatePath("/", "layout");
    revalidatePath("/profile");
    return { ok: true, data: profile };
  } catch (error) {
    return {
      ok: false,
      message: apiErrorMessage(error, "Your profile could not be updated."),
    };
  }
}
