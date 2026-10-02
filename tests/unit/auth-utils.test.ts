import { describe, expect, it } from "vitest";
import { generateTemporaryPassword, hashPassword, verifyPassword } from "@/lib/auth/password";
import { slugify, timeAgo } from "@/lib/utils";

describe("passwords", () => {
  it("hashes with argon2 and verifies", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(hash).toMatch(/^\$argon2id\$/);
    expect(await verifyPassword(hash, "correct horse battery staple")).toBe(true);
    expect(await verifyPassword(hash, "wrong")).toBe(false);
    expect(await verifyPassword("not-a-hash", "x")).toBe(false);
  });

  it("generates readable, unique temporary passwords", () => {
    const a = generateTemporaryPassword();
    expect(a).toMatch(/^[a-z2-9]{4}(-[a-z2-9]{4}){3}$/);
    expect(generateTemporaryPassword()).not.toBe(a);
  });
});

describe("utils", () => {
  it("slugifies titles", () => {
    expect(slugify("Frontend Developer (React / Next.js) — Example Co")).toBe("frontend-developer-react-next-js-example-co");
    expect(slugify("Café & Crème")).toBe("cafe-and-creme");
  });

  it("formats relative times", () => {
    const now = new Date("2026-10-02T12:00:00Z");
    expect(timeAgo(new Date("2026-10-02T10:00:00Z"), now)).toBe("2h ago");
    expect(timeAgo(new Date("2026-09-29T12:00:00Z"), now)).toBe("3d ago");
  });
});
