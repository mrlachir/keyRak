import "server-only";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { backendApiUrl } from "@/lib/env";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface ApiFetchOptions extends RequestInit {
  authenticated?: boolean;
}

/** The shared authenticated transport also supports private binary documents. */
export async function apiFetchResponse(path: string, options: ApiFetchOptions = {}): Promise<Response> {
  if (!path.startsWith("/")) {
    throw new Error("API paths must begin with '/'");
  }

  const { authenticated = true, headers: suppliedHeaders, ...requestInit } = options;
  const headers = new Headers(suppliedHeaders);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");

  const hasMultipartBody = typeof FormData !== "undefined" && requestInit.body instanceof FormData;
  if (requestInit.body && !hasMultipartBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (authenticated) {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      throw new ApiError("Authentication is required", 401);
    }
    headers.set("Authorization", `Bearer ${session.accessToken}`);
  }

  const response = await fetch(`${backendApiUrl()}${path}`, {
    ...requestInit,
    headers,
    cache: requestInit.cache ?? "no-store",
  });

  if (!response.ok) {
    const contentType = response.headers.get("content-type") ?? "";
    const body = contentType.includes("application/json")
      ? await response.json()
      : await response.text();
    throw new ApiError(`Backend request failed with HTTP ${response.status}`, response.status, body);
  }

  return response;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const response = await apiFetchResponse(path, options);
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    const backendMessage =
      error.body && typeof error.body === "object" ? Reflect.get(error.body, "message") : null;
    if (error.status === 401) return "Your session has expired. Sign in again to continue.";
    if (error.status === 403) return "You do not have permission to perform this action.";
    if (error.status >= 500) return "The service is temporarily unavailable. Please try again shortly.";
    if (typeof backendMessage === "string" && backendMessage.trim()) {
      return backendMessage;
    }
    if (error.status === 400) return "Please review the information and try again.";
  }
  if (error instanceof TypeError) {
    return "The service could not be reached. Check your connection and try again.";
  }
  return fallback;
}
