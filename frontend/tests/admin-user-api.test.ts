import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/env", () => ({ backendApiUrl: () => "https://backend.example.test" }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { getServerSession } from "next-auth";
import { GET } from "@/app/api/admin/users/[id]/id-card/route";
import { deleteUserAction, updateUserRoleAction } from "@/app/actions/users";
import { isUserId, safeAvatarUrl } from "@/lib/user-management";

const id = "11111111-1111-4111-8111-111111111111";
const fetchMock = vi.fn<typeof fetch>();
const session = { user: { id: "google-subject", role: "ADMIN" }, accessToken: "private-test-token" };
const callPreview = () => GET(new Request("https://app.example.test"), { params: Promise.resolve({ id }) });
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
  vi.mocked(getServerSession).mockResolvedValue(session);
});

describe("private document proxy", () => {
  it("forwards the Bearer token through the shared API client and streams private bytes", async () => {
    fetchMock.mockResolvedValue(new Response("image bytes", { headers: { "Content-Type": "image/png" } }));
    const result = await callPreview();
    expect(result.status).toBe(200);
    expect(await result.text()).toBe("image bytes");
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe(`https://backend.example.test/api/admin/users/${id}/id-card`);
    expect((options?.headers as Headers).get("Authorization")).toBe("Bearer private-test-token");
    expect(options?.cache).toBe("no-store");
    expect(options?.redirect).toBe("error");
    expect(result.headers.get("cache-control")).toContain("no-store");
    expect(result.headers.get("authorization")).toBeNull();
  });

  it.each([401, 403, 404, 500])("returns a clean, uncached 404 for backend %i", async status => {
    fetchMock.mockResolvedValue(new Response("internal storage error", { status }));
    const result = await callPreview();
    expect(result.status).toBe(404);
    expect(result.headers.get("cache-control")).toContain("no-store");
    expect(await result.text()).not.toContain("internal storage error");
  });

  it.each([null, { ...session, user: { role: "CLIENT" } }])("never contacts the backend without an admin session", async value => {
    vi.mocked(getServerSession).mockResolvedValue(value);
    expect((await callPreview()).status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects HTML pretending to be a document and invalid user IDs", async () => {
    fetchMock.mockResolvedValue(new Response("<h1>Sign in</h1>", { headers: { "Content-Type": "text/html" } }));
    expect((await callPreview()).status).toBe(404);
    fetchMock.mockClear();
    expect((await GET(new Request("https://app.example.test"), { params: Promise.resolve({ id: "../private" }) })).status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("admin user mutations", () => {
  it("PATCHes a valid role with authentication", async () => {
    fetchMock.mockResolvedValue(Response.json({ id, role: "ADMIN" }));
    expect((await updateUserRoleAction(id, "ADMIN")).ok).toBe(true);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe(`https://backend.example.test/api/admin/users/${id}/role`);
    expect(options?.method).toBe("PATCH");
    expect(options?.body).toBe('{"role":"ADMIN"}');
    expect((options?.headers as Headers).get("Authorization")).toBe("Bearer private-test-token");
  });
  it("rejects nonadmins and invalid mutation payloads without fetching", async () => {
    expect((await updateUserRoleAction(id, "OWNER" as "ADMIN")).ok).toBe(false);
    expect((await updateUserRoleAction("../user", "ADMIN")).ok).toBe(false);
    vi.mocked(getServerSession).mockResolvedValue({ ...session, user: { role: "CLIENT" } });
    expect((await deleteUserAction(id, "guest@example.test")).ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("requires matching confirmation before DELETE", async () => {
    fetchMock.mockResolvedValue(Response.json({ id, email: "guest@example.test" }));
    expect((await deleteUserAction(id, "wrong@example.test")).ok).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce(Response.json({ id, email: "guest@example.test" }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    expect((await deleteUserAction(id, "guest@example.test")).ok).toBe(true);
    expect(fetchMock.mock.calls[1][1]?.method).toBe("DELETE");
  });
  it("returns the booking-history guard error to the UI", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ id, email: "guest@example.test" }))
      .mockResolvedValueOnce(Response.json({ message: "This account has booking history." }, { status: 409 }));
    expect(await deleteUserAction(id, "guest@example.test")).toEqual({ ok: false, message: "This account has booking history." });
  });
  it("rejects unsafe references and avatar URLs", () => {
    expect(isUserId(id)).toBe(true);
    expect(isUserId("../../secret")).toBe(false);
    expect(safeAvatarUrl("javascript:alert(1)")).toBeUndefined();
    expect(safeAvatarUrl("https://name:secret@example.test/a.png")).toBeUndefined();
  });
});
