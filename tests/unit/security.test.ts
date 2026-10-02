import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guard rail for the security rules in docs/ADMIN_PANEL_PLAN.md:
 * every Server Action and route handler must check the session on the server.
 */
const PUBLIC_ACTIONS = new Set([
  "login", // signs in
  "logout", // only destroys the caller's own session
  "acceptInvite", // gated by a one-time hashed token
  "saveThemeCookieOnly", // sets a cosmetic cookie on the login page
]);

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

describe("server-side authorization", () => {
  const actionFiles = files(path.join(root, "actions"), /\.tsx?$/);

  it("finds the Server Action modules", () => {
    expect(actionFiles.length).toBeGreaterThan(8);
  });

  it.each(actionFiles.map((f) => [path.relative(root, f), f]))("%s: every exported action calls requireUser", (_name, file) => {
    const source = readFileSync(file, "utf8");
    expect(source.startsWith('"use server"')).toBe(true);
    for (const [fn, body] of exportedFunctions(source)) {
      if (PUBLIC_ACTIONS.has(fn)) continue;
      expect(body, `${fn} must call requireUser()`).toMatch(/await requireUser\(/);
    }
  });

  it("admin-only actions require the admin role", () => {
    const users = readFileSync(path.join(root, "actions/users.ts"), "utf8");
    for (const fn of ["inviteUser", "revokeInvite", "changeRole", "removeUser"]) {
      expect(exportedFunctions(users).get(fn), fn).toMatch(/requireUser\("admin"\)/);
    }
    expect(exportedFunctions(readFileSync(path.join(root, "actions/settings.ts"), "utf8")).get("saveSettings")).toMatch(/requireUser\("admin"\)/);
  });

  it("every API route handler checks the session", () => {
    for (const file of files(path.join(root, "api"), /^route\.ts$/)) {
      const source = readFileSync(file, "utf8");
      expect(source, path.relative(root, file)).toMatch(/await requireUser\(/);
    }
  });

  it("admin-only pages require the admin role", () => {
    for (const page of ["(admin)/settings/page.tsx", "(admin)/users/page.tsx"]) {
      expect(readFileSync(path.join(root, page), "utf8"), page).toMatch(/requireUser\("admin"\)/);
    }
  });

  it("every admin page checks the session itself (not only the layout or proxy)", () => {
    for (const file of files(path.join(root, "(admin)"), /^page\.tsx$/)) {
      expect(readFileSync(file, "utf8"), path.relative(root, file)).toMatch(/requireUser\(/);
    }
  });
});
