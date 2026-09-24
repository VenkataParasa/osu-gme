import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({ headless: true, channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const go = async (path) => {
  await page.goto(`http://localhost:5173/#${path}`);
};
const card = (title) =>
  page
    .locator(".card")
    .filter({ has: page.getByRole("heading", { name: title, exact: true }) });
const stat = (label) =>
  page
    .locator(".module-stat")
    .filter({ has: page.getByText(label, { exact: true }) })
    .locator("strong");
const file = (name) => ({
  name,
  mimeType: "application/pdf",
  buffer: Buffer.from("Demo metadata upload"),
});
try {
  await go("recruitment");
  await expect(stat("Applicant Records")).toHaveText("6");
  await expect(stat("Recorded Matches")).toHaveText("1");
  await expect(stat("OSU Student Match Rate")).toHaveText("25%");
  await page
    .getByRole("button", { name: "Family Medicine", exact: true })
    .click();
  await expect(card("Applicant Rankings").locator("tbody tr")).toHaveCount(3);
  await page.getByRole("button", { name: "Rank ↑", exact: true }).click();
  await expect(
    card("Applicant Rankings").locator("tbody tr").first(),
  ).toContainText("Jamie Patel");
  await go("recruitment/history");
  await page.getByLabel("From Year", { exact: true }).selectOption("2025");
  await page.getByLabel("To Year", { exact: true }).selectOption("2026");
  await expect(
    card("Historical Ranking & Match Trends").locator("tbody tr"),
  ).toHaveCount(2);
  await page.screenshot({
    path: "/tmp/gme-recruitment-history.png",
    fullPage: true,
  });
  await go("integrations");
  await page
    .getByRole("button", { name: "Simulate NRMP Sync", exact: true })
    .click();
  await expect(page.getByRole("progressbar")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "NRMP Sync Details", exact: true }),
  ).toBeVisible();
  await expect(stat("Created")).toHaveText("3");
  await expect(stat("Updated")).toHaveText("3");
  await expect(
    page.getByText(/unknown or mismatched program association/),
  ).toBeVisible();
  await go("recruitment");
  await expect(stat("Applicant Records")).toHaveText("7");
  await expect(stat("Recorded Matches")).toHaveText("4");
  await expect(stat("OSU Student Match Rate")).toHaveText("50%");
  await go("reports/recruitment");
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export CSV", exact: true })
    .first()
    .click();
  assert.equal((await downloaded).suggestedFilename(), "recruitment-match.csv");
  await go("reviews/SRV-001");
  await page
    .getByLabel("Action Title", { exact: true })
    .fill("Browser demo action");
  await page.getByLabel("Deadline", { exact: true }).fill("2026-10-20");
  await page
    .getByRole("button", { name: "Add Action Item", exact: true })
    .click();
  const action = card("Action Items & Deadlines")
    .locator("tbody tr")
    .filter({ hasText: "Browser demo action" });
  await expect(action).toBeVisible();
  await action.getByRole("button", { name: "Edit", exact: true }).click();
  await page
    .getByLabel("Action Title", { exact: true })
    .fill("Updated browser action");
  await page.getByRole("button", { name: "Save Action", exact: true }).click();
  await card("Action Items & Deadlines")
    .locator("tbody tr")
    .filter({ hasText: "Updated browser action" })
    .getByRole("button", { name: "Mark Complete", exact: true })
    .click();
  await expect(
    card("Action Items & Deadlines")
      .locator("tbody tr")
      .filter({ hasText: "Updated browser action" }),
  ).toContainText("Completed");
  await page
    .getByLabel("Status Note", { exact: true })
    .fill("Browser review completed");
  await page
    .getByLabel("Review Status", { exact: true })
    .selectOption("Closed");
  await page
    .getByRole("button", { name: "Save Status Update", exact: true })
    .click();
  await expect(card("Activity & Status History")).toContainText(
    "In Progress → Closed",
  );
  await page
    .getByLabel("Activity Description", { exact: true })
    .fill("Follow-up meeting scheduled for next month.");
  await page
    .getByRole("button", { name: "Add Follow-Up", exact: true })
    .click();
  await expect(card("Institutional Follow-Up")).toContainText(
    "Follow-up meeting scheduled for next month.",
  );
  await page
    .getByLabel("Supporting File", { exact: true })
    .setInputFiles(file("review-plan.pdf"));
  await page
    .getByRole("button", { name: "Upload Document", exact: true })
    .click();
  await expect(card("Supporting Documents")).toContainText("review-plan.pdf");
  await page.screenshot({
    path: "/tmp/gme-review-management.png",
    fullPage: true,
  });
  await go("ape/PRG-007?year=2025-26");
  await page
    .getByLabel("Evaluation File", { exact: true })
    .setInputFiles(file("neurology-ape.pdf"));
  await page
    .getByRole("button", { name: "Upload Evaluation Document", exact: true })
    .click();
  await expect(card("Evaluation Record")).toContainText("neurology-ape.pdf");
  await page
    .getByLabel("Upload Type", { exact: true })
    .selectOption("supporting");
  await page
    .getByLabel("Evaluation File", { exact: true })
    .setInputFiles(file("supporting-ape.pdf"));
  await page
    .getByRole("button", { name: "Upload Evaluation Document", exact: true })
    .click();
  await go("reports/ape?year=2025-26&program=PRG-007");
  await expect(stat("APE Submitted")).toHaveText("1");
  await expect(page.locator("tbody tr")).toContainText("Submitted");
  await go("integrations");
  await page
    .getByRole("button", { name: "Simulate New Innovations Sync", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "New Innovations Sync Details",
      exact: true,
    }),
  ).toBeVisible();
  await page.screenshot({ path: "/tmp/gme-integrations.png", fullPage: true });
  await go("programs/PRG-004");
  await expect(page.getByText("97.4%", { exact: true }).first()).toBeVisible();
  await page.getByLabel("Demo user role").selectOption("USR-006");
  await go("recruitment/applicants");
  await expect(card("Applicant Rankings").locator("tbody tr")).toHaveCount(3);
  await go("reviews/SRV-001");
  await expect(
    page.getByText("Review not found or outside your demo role’s scope."),
  ).toBeVisible();
  await go("integrations");
  await expect(
    page.getByText(/Integration operations and institutional sync history/),
  ).toBeVisible();
  await page.getByLabel("Demo user role").selectOption("USR-001");
  await go("reviews/SRV-001");
  await expect(
    page.getByRole("button", { name: "Save Status Update" }),
  ).toHaveCount(0);
  await page.getByLabel("Demo user role").selectOption("USR-004");
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of [
    "recruitment",
    "recruitment/history",
    "reviews",
    "reviews/SRV-001",
    "ape",
    "ape/PRG-007",
    "integrations",
    "reports/recruitment",
  ]) {
    await go(route);
    await page.waitForTimeout(150);
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `Mobile overflow on ${route}`,
    );
  }
  await page.screenshot({
    path: "/tmp/gme-extensions-mobile.png",
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  console.log(
    "Extension browser journey passed: recruitment, sorting, history, CSV, simulated syncs, shared metrics, review edits/history, follow-up, document and APE uploads, reports, roles and mobile layouts.",
  );
} finally {
  await browser.close();
}
