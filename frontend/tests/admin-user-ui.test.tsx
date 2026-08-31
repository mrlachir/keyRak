// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { UserManagementTable } from "@/components/admin/user-management-table";
import { UserManagementModal } from "@/components/admin/user-management-modal";
import { SecureIdCard } from "@/components/admin/secure-id-card";
import { deleteUserAction, getAdminUserAction, updateUserRoleAction } from "@/app/actions/users";
import type { AdminUser } from "@/types";

vi.mock("@/app/actions/users", () => ({ getAdminUserAction: vi.fn(), updateUserRoleAction: vi.fn(), deleteUserAction: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const user: AdminUser = { id: "11111111-1111-4111-8111-111111111111", displayName: "Amina Guest", email: "guest@example.test",
  telephone: "+212600000000", role: "CLIENT", createdAt: "2026-08-31T12:00:00Z", avatarUrl: "https://example.test/avatar.png", hasIdCard: true };

beforeEach(() => {
  vi.clearAllMocks();
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
  vi.mocked(getAdminUserAction).mockResolvedValue({ ok: true, data: user });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("user management modal", () => {
  it("opens from the table, displays profile fields, and saves a changed role", async () => {
    vi.mocked(updateUserRoleAction).mockResolvedValue({ ok: true, data: { ...user, role: "ADMIN" } });
    render(<UserManagementTable users={[user]} currentUserId="other-admin" />);
    fireEvent.click(screen.getAllByText("Amina Guest")[0]);
    const dialog = screen.getByRole("dialog");
    await within(dialog).findByText(user.id);
    expect(within(dialog).getByText(user.telephone!)).toBeDefined();
    expect(within(dialog).getByText("31 August 2026")).toBeDefined();
    expect(within(dialog).getByRole("img").getAttribute("src")).toBe(user.avatarUrl);
    fireEvent.change(within(dialog).getByLabelText("Account role"), { target: { value: "ADMIN" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save role" }));
    await waitFor(() => expect(updateUserRoleAction).toHaveBeenCalledWith(user.id, "ADMIN"));
    await waitFor(() => expect((within(dialog).getByRole("button", { name: "Save role" }) as HTMLButtonElement).disabled).toBe(true));
  });
  it("requires typed confirmation and removes the row only after successful deletion", async () => {
    vi.mocked(deleteUserAction).mockResolvedValue({ ok: true, data: null });
    render(<UserManagementTable users={[user]} currentUserId="other-admin" />);
    fireEvent.click(screen.getAllByText("Amina Guest")[0]);
    const dialog = screen.getByRole("dialog");
    await within(dialog).findByText(user.id);
    fireEvent.click(within(dialog).getByRole("button", { name: "Remove client / user" }));
    const remove = within(dialog).getByRole("button", { name: "Permanently remove" }) as HTMLButtonElement;
    expect(remove.disabled).toBe(true);
    fireEvent.change(within(dialog).getByLabelText(`Type ${user.email} to confirm`), { target: { value: user.email } });
    fireEvent.click(remove);
    await waitFor(() => expect(deleteUserAction).toHaveBeenCalledWith(user.id, user.email));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.queryByText("Amina Guest")).toBeNull();
  });
  it("shows backend rejection and leaves the account intact", async () => {
    vi.mocked(updateUserRoleAction).mockResolvedValue({ ok: false, message: "Administrator access is required." });
    render(<UserManagementModal initialUser={user} currentUserId="other-admin" onClose={vi.fn()} onUpdated={vi.fn()} onRemoved={vi.fn()} />);
    await screen.findByText(user.id);
    fireEvent.change(screen.getByLabelText("Account role"), { target: { value: "ADMIN" } });
    fireEvent.click(screen.getByRole("button", { name: "Save role" }));
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Administrator access is required.");
  });
  it("disables self-removal and self-role changes", async () => {
    render(<UserManagementModal initialUser={user} currentUserId={user.id} onClose={vi.fn()} onUpdated={vi.fn()} onRemoved={vi.fn()} />);
    await screen.findByText(user.id);
    expect((screen.getByLabelText("Account role") as HTMLSelectElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Remove client / user" }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("private document preview", () => {
  it.each([401, 403, 404])("shows a clean fallback for status %s", async status => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("private raw error", { status })));
    render(<SecureIdCard userId={user.id} />);
    fireEvent.click(screen.getByRole("button", { name: "View private document" }));
    expect(await screen.findByText(/Document not available/)).toBeDefined();
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.queryByText("private raw error")).toBeNull();
  });
  it("creates a private blob preview and revokes it when hidden", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("image", { headers: { "Content-Type": "image/png" } })));
    const revoke = vi.fn();
    URL.createObjectURL = vi.fn().mockReturnValue("blob:private-preview");
    URL.revokeObjectURL = revoke;
    render(<SecureIdCard userId={user.id} />);
    fireEvent.click(screen.getByRole("button", { name: "View private document" }));
    expect((await screen.findByRole("img")).getAttribute("src")).toBe("blob:private-preview");
    expect(fetch).toHaveBeenCalledWith(`/api/admin/users/${user.id}/id-card`, expect.objectContaining({ credentials: "same-origin", cache: "no-store" }));
    fireEvent.click(screen.getByRole("button", { name: "Hide document" }));
    expect(revoke).toHaveBeenCalledWith("blob:private-preview");
  });
});
