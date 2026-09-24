import { chromium } from "@playwright/test";
const browser = await chromium.launch({ headless: true, channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto("http://localhost:5173/");
await page.getByRole("heading", { name: "Institutional Overview" }).waitFor();
await page.waitForTimeout(800);
console.log(
  await page.evaluate(() => ({
    width: innerWidth,
    scroll: document.documentElement.scrollWidth,
    overflow: [...document.querySelectorAll("body *")]
      .map((e) => ({
        tag: e.tagName,
        cls: e.className,
        x: e.getBoundingClientRect().x,
        width: e.getBoundingClientRect().width,
        right: e.getBoundingClientRect().right,
      }))
      .filter((e) => e.right > innerWidth + 1 && e.width > 0),
  })),
);
await page.screenshot({ path: "/tmp/gme-mobile-clean.png", fullPage: true });
await browser.close();
