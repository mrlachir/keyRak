// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { signIn } from "next-auth/react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { GoogleSignIn } from "@/components/auth/google-sign-in";
import SignInPage from "@/app/auth/signin/page";

vi.mock("next-auth/react", () => ({ signIn: vi.fn() }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(() => { throw new Error("NEXT_REDIRECT"); }) }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getServerSession).mockResolvedValue(null);
  vi.mocked(signIn).mockResolvedValue(undefined);
});
afterEach(cleanup);

describe("branded sign-in page", () => {
  it("renders the site image, Google login, and working navigation links", async () => {
    render(await SignInPage({ searchParams: Promise.resolve({ callbackUrl: "/properties/123#reviews" }) }));
    expect(screen.getByRole("heading", { name: "Welcome to KEYRAK." })).toBeDefined();
    expect(screen.getByRole("img", { name: /Sunlit arches/ })).toBeDefined();
    expect(screen.getByRole("link", { name: "Back to exploring" }).getAttribute("href")).toBe("/search");
    expect(screen.getByRole("link", { name: "Privacy Policy" }).getAttribute("href")).toBe("/privacy");
    fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
    expect(signIn).toHaveBeenCalledWith("google", { callbackUrl: "/properties/123#reviews" });
  });

  it("redirects signed-in users to their original destination", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { name: "Guest" } });
    await expect(SignInPage({ searchParams: Promise.resolve({ callbackUrl: "/wishlist" }) })).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/wishlist");
  });

  it("shows auth errors instead of redirecting in a loop", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { name: "Guest" } });
    render(await SignInPage({ searchParams: Promise.resolve({ error: "OAuthCallback" }) }));
    expect(screen.getByRole("alert").textContent).toContain("couldn’t complete");
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe("Google sign-in control", () => {
  it("disables duplicate clicks and forwards the return URL", async () => {
    render(<GoogleSignIn callbackUrl="/profile" initialError={null} />);
    const button = screen.getByRole("button");
    fireEvent.click(button);
    fireEvent.click(button);
    expect(signIn).toHaveBeenCalledTimes(1);
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(button.textContent).toContain("Connecting to Google");
  });

  it("shows a clean error and allows another attempt after a failure", async () => {
    vi.mocked(signIn).mockRejectedValueOnce(new Error("internal error"));
    render(<GoogleSignIn callbackUrl="/profile" initialError={null} />);
    fireEvent.click(screen.getByRole("button"));
    expect((await screen.findByRole("alert")).textContent).not.toContain("internal error");
    await waitFor(() => expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole("button"));
    expect(signIn).toHaveBeenCalledTimes(2);
  });

  it("restores the button when returning from Google's page", () => {
    render(<GoogleSignIn callbackUrl="/" initialError={null} />);
    fireEvent.click(screen.getByRole("button"));
    fireEvent(window, new Event("pageshow"));
    expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(false);
  });
});
