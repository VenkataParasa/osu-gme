import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({ headless: true, channel: "chrome" });
const page = await browser.newPage({
  viewport: { width: 1440, height: 1050 },
  deviceScaleFactor: 1,
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://localhost:5173/");
await page.getByRole("heading", { name: "Institutional Overview" }).waitFor();
await page.screenshot({ path: "/tmp/gme-desktop.png", fullPage: true });
await page.locator("nav").getByText("Dashboard", { exact: true }).click();
await page
  .getByRole("heading", { name: "Program Performance Dashboard" })
  .waitFor();
await page
  .getByRole("button", {
    name: "3-year board pass rate, sort ascending",
  })
  .click();
await expect(
  page.locator(".program-performance-table tbody tr").first(),
).toContainText("General Surgery");
await expect(
  page.getByRole("columnheader", { name: /3-year board pass rate/ }),
).toHaveAttribute("aria-sort", "ascending");
await page.locator("nav").getByText("Overview", { exact: true }).click();
await page.getByRole("heading", { name: "Institutional Overview" }).waitFor();
await page.getByRole("button", { name: "Review program", exact: true }).click();
await page
  .getByRole("heading", { name: "General Surgery Residency", exact: true })
  .waitFor();
assert.ok(await page.getByText("75%", { exact: true }).count());
await page.locator("nav").getByText("Resident Concerns").click();
await page
  .getByLabel("Classification", { exact: true })
  .selectOption("Reviewable");
await expect(page.locator(".concern-table tbody tr")).toHaveCount(4);
await page.getByRole("button", { name: "Open concern CON-0008" }).click();
await page.getByRole("heading", { name: "Record History" }).waitFor();
await page
  .getByLabel("Classification", { exact: true })
  .selectOption("Non-Reviewable");
await page
  .getByLabel("Update note")
  .fill("Browser verification: reviewed supporting documentation.");
await page.getByLabel("Supporting document").setInputFiles({
  name: "supporting-note.pdf",
  mimeType: "application/pdf",
  buffer: Buffer.from("browser verification document"),
});
await page.getByRole("button", { name: "Save update" }).click();
await page.getByText("Classification Change", { exact: true }).waitFor();
await page.getByText("Document Added", { exact: true }).waitFor();
await page.getByText("supporting-note.pdf", { exact: true }).waitFor();
assert.ok(
  await page
    .locator(".history-change")
    .getByText("Reviewable", { exact: true })
    .isVisible(),
);
assert.ok(
  await page
    .locator(".history-change")
    .getByText("Non-Reviewable", { exact: true })
    .isVisible(),
);
await page.locator("nav").getByText("Reports", { exact: true }).click();
await page
  .getByRole("heading", { name: "Resident Concern Report", exact: true })
  .waitFor();
await page
  .getByLabel("Classification", { exact: true })
  .selectOption("Reviewable");
await expect(page.locator(".concern-table tbody tr")).toHaveCount(3);
const downloadEvent = page.waitForEvent("download");
await page.getByRole("button", { name: "Export CSV", exact: true }).click();
const download = await downloadEvent;
assert.equal(download.suggestedFilename(), "gme-concern-report.csv");
await page.getByLabel("Demo user role").selectOption("USR-006");
await page.getByRole("heading", { name: "Institutional Overview" }).waitFor();
await page.locator("nav").getByText("Dashboard", { exact: true }).click();
await expect(page.locator("tbody tr")).toHaveCount(1);
await page.goto("http://localhost:5173/#concerns/CON-0008");
await page
  .getByText("Concern not found or outside your demo role’s scope.")
  .waitFor();
await page.getByLabel("Demo user role").selectOption("USR-001");
await page.goto("http://localhost:5173/#concerns/CON-0008");
await page.getByText(/This demo role has read-only access/).waitFor();
await page.getByLabel("Demo user role").selectOption("USR-004");
await page.locator("nav").getByText("Resident Concerns").click();
await page.getByRole("button", { name: "New concern" }).click();
await page.getByLabel("Resident", { exact: true }).selectOption("RES-0001");
await page
  .getByLabel("Concern summary", { exact: true })
  .fill("Demo follow-up for browser verification");
await page.getByRole("button", { name: "Create concern", exact: true }).click();
await page.getByRole("heading", { name: "Camila Gray, DO" }).waitFor();
await page
  .getByText("Demo follow-up for browser verification")
  .first()
  .waitFor();
await page.goto("http://localhost:5173/#overview");
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(350);
await page.screenshot({ path: "/tmp/gme-mobile.png", fullPage: true });
assert.ok(
  await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  ),
);
await page.getByRole("button", { name: "Open navigation" }).click();
await page.locator("nav").getByText("Resident Concerns").click();
await page.getByLabel("Search concerns").fill("Camila");
await expect(page.locator(".concern-table tbody tr")).toHaveCount(1);
assert.ok(
  await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  ),
);
assert.deepEqual(errors, []);
await browser.close();
console.log(
  "Browser checks passed: program drill-down, concern filtering, history, reporting, CSV export, role scope, read-only access, creation, mobile navigation and search.",
);
