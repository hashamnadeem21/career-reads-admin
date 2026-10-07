/** QA companies (local test databases only). Two of them, to test that each sees only its own jobs. */
export const TEST_COMPANIES = {
  acme: { name: "Acme QA Ltd", website: "https://acme.example", autoPublish: false },
  globex: { name: "Globex QA Ltd", website: "https://globex.example", autoPublish: true },
};

/** QA accounts for e2e tests (local test databases only). The API's `npm run e2e:seed` creates them. */
export const TEST_USERS = {
  admin: { email: "qa-admin@blognest.test", name: "Quinn Admin", role: "super_admin" as const, password: "qa-admin-pass-1234", company: null },
  editor: { email: "qa-editor@blognest.test", name: "Eddie Editor", role: "editor" as const, password: "qa-editor-pass-1234", company: null },
  acme: { email: "qa-acme@blognest.test", name: "Ada Acme", role: "company" as const, password: "qa-acme-pass-1234", company: "acme" as const },
  globex: { email: "qa-globex@blognest.test", name: "Gil Globex", role: "company" as const, password: "qa-globex-pass-1234", company: "globex" as const },
};
