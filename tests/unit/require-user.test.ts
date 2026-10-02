import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionUser } from "@/lib/auth/session";

const getCurrentUser = vi.fn<() => Promise<SessionUser | null>>();

vi.mock("@/lib/auth/session", () => ({ getCurrentUser: () => getCurrentUser() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
  forbidden: () => {
    throw new Error("FORBIDDEN");
  },
}));

const { requireUser, isAdmin } = await import("@/lib/auth/require-user");

const editor: SessionUser = { id: "1", name: "Eddie", email: "e@x.test", role: "editor", mustChangePassword: false };
const admin: SessionUser = { ...editor, id: "2", role: "admin" };

describe("requireUser", () => {
  beforeEach(() => getCurrentUser.mockReset());

  it("redirects to /login when nobody is signed in", async () => {
    getCurrentUser.mockResolvedValue(null);
    await expect(requireUser()).rejects.toThrow("REDIRECT:/login");
  });

  it("returns any signed-in user when no role is required", async () => {
    getCurrentUser.mockResolvedValue(editor);
    await expect(requireUser()).resolves.toBe(editor);
  });

  it("blocks editors from admin-only pages with a 403", async () => {
    getCurrentUser.mockResolvedValue(editor);
    await expect(requireUser("admin")).rejects.toThrow("FORBIDDEN");
  });

  it("lets admins through admin-only pages", async () => {
    getCurrentUser.mockResolvedValue(admin);
    await expect(requireUser("admin")).resolves.toBe(admin);
    expect(isAdmin(admin)).toBe(true);
    expect(isAdmin(editor)).toBe(false);
  });
});
