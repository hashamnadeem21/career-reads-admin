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

const { requireUser, requireStaff, requireSuperAdmin, isStaff, isSuperAdmin } = await import("@/lib/auth/require-user");

const base = { mustChangePassword: false, companyId: null, companyName: null, companyAutoPublish: false, theme: "system" as const };
const editor: SessionUser = { ...base, id: "1", name: "Eddie", email: "e@x.test", role: "editor" };
const owner: SessionUser = { ...base, id: "2", name: "Hasham", email: "h@x.test", role: "super_admin" };
const company: SessionUser = { ...base, id: "3", name: "Ada", email: "a@x.test", role: "company", companyId: "c1", companyName: "Acme" };

describe("requireUser", () => {
  beforeEach(() => getCurrentUser.mockReset());

  it("redirects to /login when nobody is signed in", async () => {
    getCurrentUser.mockResolvedValue(null);
    await expect(requireUser()).rejects.toThrow("REDIRECT:/login");
    await expect(requireStaff()).rejects.toThrow("REDIRECT:/login");
  });

  it("returns any signed-in user when no role is required", async () => {
    for (const u of [editor, owner, company]) {
      getCurrentUser.mockResolvedValue(u);
      await expect(requireUser()).resolves.toBe(u);
    }
  });

  it("keeps company accounts out of staff pages with a 403", async () => {
    getCurrentUser.mockResolvedValue(company);
    await expect(requireStaff()).rejects.toThrow("FORBIDDEN");
    await expect(requireSuperAdmin()).rejects.toThrow("FORBIDDEN");
  });

  it("lets editors into staff pages but not super-admin pages", async () => {
    getCurrentUser.mockResolvedValue(editor);
    await expect(requireStaff()).resolves.toBe(editor);
    await expect(requireSuperAdmin()).rejects.toThrow("FORBIDDEN");
  });

  it("lets super admins in everywhere", async () => {
    getCurrentUser.mockResolvedValue(owner);
    await expect(requireStaff()).resolves.toBe(owner);
    await expect(requireSuperAdmin()).resolves.toBe(owner);
    expect(isSuperAdmin(owner.role)).toBe(true);
    expect(isStaff(company.role)).toBe(false);
  });
});
