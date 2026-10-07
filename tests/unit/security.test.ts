import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guard rails for the security rules in docs/ADMIN_PANEL_PLAN.md:
 * every Server Action, route handler and page checks the session on the server,
 * and company accounts can only reach job-related code.
 */
const PUBLIC_ACTIONS = new Set([
  "login", // signs in
  "logout", // only destroys the caller's own session
  "acceptInvite", // gated by a one-time hashed token
  "saveThemeCookieOnly", // sets a cosmetic cookie on the login page
]);

/** Action modules company accounts may call. Each function must scope to the caller's company itself. */
const COMPANY_ACTION_MODULES = new Set(["jobs.ts", "search.ts", "auth.ts", "preferences.ts"]);

/** Pages company accounts may open (dashboard branches by role; job pages are scoped). */
const COMPANY_PAGES = new Set(["(admin)/page.tsx", "(admin)/jobs/page.tsx", "(admin)/jobs/new/page.tsx", "(admin)/jobs/[slug]/page.tsx"]);

/** Super-admin-only pages and actions. */
const SUPER_ADMIN_PAGES = ["(admin)/settings/page.tsx", "(admin)/users/page.tsx", "(admin)/companies/page.tsx", "(admin)/companies/[id]/page.tsx"];

const GUARD = /await (requireUser|requireStaff|requireSuperAdmin)\(/;

function files(dir: string, match: RegExp): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? files(full, match) : match.test(e.name) ? [full] : [];
  });
}

/** Splits a module into its exported async functions (name → body). */
function exportedFunctions(source: string): Map<string, string> {
  const result = new Map<string, string>();
  const re = /export async function (\w+)\s*\(/g;
  const starts = [...source.matchAll(re)];
  starts.forEach((m, i) => result.set(m[1], source.slice(m.index, starts[i + 1]?.index ?? source.length)));
  return result;
}

const root = path.join(process.cwd(), "src/app");
const read = (rel: string) => readFileSync(path.join(root, rel), "utf8");
const actionFiles = files(path.join(root, "actions"), /\.tsx?$/);

describe("server-side authorization", () => {
  it("finds the Server Action modules", () => {
    expect(actionFiles.length).toBeGreaterThan(8);
  });

  it.each(actionFiles.map((f) => [path.relative(root, f), f]))("%s: every exported action checks the session", (_name, file) => {
    const source = readFileSync(file, "utf8");
    expect(source.startsWith('"use server"')).toBe(true);
    for (const [fn, body] of exportedFunctions(source)) {
      if (PUBLIC_ACTIONS.has(fn)) continue;
      expect(body, `${fn} must call requireUser/requireStaff/requireSuperAdmin`).toMatch(GUARD);
    }
  });

  it.each(actionFiles.filter((f) => !COMPANY_ACTION_MODULES.has(path.basename(f))).map((f) => [path.relative(root, f), f]))(
    "%s: company accounts can't call it (staff or super admin only)",
    (_name, file) => {
      for (const [fn, body] of exportedFunctions(readFileSync(file, "utf8"))) {
        if (PUBLIC_ACTIONS.has(fn)) continue;
        expect(body, `${fn} must call requireStaff() or requireSuperAdmin()`).toMatch(/await (requireStaff|requireSuperAdmin)\(/);
      }
    },
  );

  it("job actions open to companies load jobs through the company check", () => {
    const jobs = exportedFunctions(read("actions/jobs.ts"));
    for (const fn of ["duplicateJob", "closeJobNow", "setJobStatus", "deleteJob", "approveJob", "rejectJob"]) {
      expect(jobs.get(fn), fn).toMatch(/loadJob\(user, /);
    }
    expect(jobs.get("saveJob")).toMatch(/canAccessJob\(user, /);
    expect(jobs.get("bulkJobs")).toMatch(/jobScope\(user\)/);
    for (const fn of ["approveJob", "rejectJob"]) expect(jobs.get(fn), fn).toMatch(/requireStaff\(\)/);
  });

  it("super-admin actions require the super admin role", () => {
    const users = exportedFunctions(read("actions/users.ts"));
    for (const fn of ["inviteUser", "revokeInvite", "changeRole", "removeUser"]) expect(users.get(fn), fn).toMatch(/requireSuperAdmin\(\)/);
    expect(exportedFunctions(read("actions/settings.ts")).get("saveSettings")).toMatch(/requireSuperAdmin\(\)/);
    for (const [fn, body] of exportedFunctions(read("actions/companies.ts"))) expect(body, fn).toMatch(/requireSuperAdmin\(\)/);
  });

  it("invite creation is not a Server Action (it has no permission check of its own)", () => {
    expect(readFileSync(path.join(process.cwd(), "src/lib/auth/invites.ts"), "utf8")).toMatch(/^import "server-only";/);
    for (const file of actionFiles) expect(readFileSync(file, "utf8"), file).not.toMatch(/export async function createInvite/);
  });

  it("every API route handler is staff-only", () => {
    for (const file of files(path.join(root, "api"), /^route\.ts$/)) {
      expect(readFileSync(file, "utf8"), path.relative(root, file)).toMatch(/await (requireStaff|requireSuperAdmin)\(/);
    }
  });

  it("super-admin pages require the super admin role", () => {
    for (const page of SUPER_ADMIN_PAGES) expect(read(page), page).toMatch(/await requireSuperAdmin\(\)/);
  });

  it("every admin page checks the session itself, and only job pages are open to companies", () => {
    const pages = files(path.join(root, "(admin)"), /^page\.tsx$/).map((f) => path.relative(root, f));
    for (const page of COMPANY_PAGES) expect(pages).toContain(page);
    for (const page of pages) {
      const source = read(page);
      expect(source, page).toMatch(GUARD);
      if (!COMPANY_PAGES.has(page)) expect(source, `${page} must be staff-only`).toMatch(/await (requireStaff|requireSuperAdmin)\(/);
    }
  });

  it("company-visible job pages scope their data to the signed-in user", () => {
    expect(read("(admin)/jobs/page.tsx")).toMatch(/listJobs\(user, /);
    expect(read("(admin)/jobs/page.tsx")).toMatch(/jobStatusCounts\(user\)/);
    expect(read("(admin)/jobs/[slug]/page.tsx")).toMatch(/getJob\(slug, user\)/);
  });
});
