import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,channel:'chrome'}); const page=await browser.newPage({viewport:{width:1280,height:900}}); const errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto('http://localhost:5173/#health'); await page.getByRole('heading',{name:'Program Health',exact:true}).waitFor();
 await expect(page.getByRole('heading',{name:'Program Health Matrix'})).toBeVisible(); await expect(page.locator('.card').filter({has:page.getByRole('heading',{name:'Program Health Matrix',exact:true})}).locator('tbody tr')).toHaveCount(10);
 await page.getByRole('button',{name:'General Surgery',exact:true}).click(); await page.getByRole('heading',{name:'General Surgery',exact:true}).waitFor();
 await page.getByRole('button',{name:'Accreditation',exact:true}).click(); await page.waitForURL(/health\/program\/PRG-004\/accreditation/); await expect(page.getByRole('heading',{name:'Accreditation & Compliance'})).toBeVisible();
 await page.getByRole('button',{name:'Trainee Health',exact:true}).click(); await page.waitForURL(/trainees/); await expect(page.getByText(/Aggregate institutional survey fixture/)).toBeVisible();
 await page.getByRole('button',{name:'Faculty & Leadership',exact:true}).click(); await page.waitForURL(/leadership/); await expect(page.getByText('Dr. Jordan Wells',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Growth',exact:true}).click(); await page.waitForURL(/growth/); await page.getByRole('button',{name:'View \/ Update',exact:true}).click();
 await page.getByLabel('Add Update',{exact:true}).fill('Browser growth update.'); await page.getByRole('button',{name:'Add Update',exact:true}).click();
 await page.goto('http://localhost:5173/#health/comparison'); await page.getByLabel('Family Medicine').check(); await page.getByLabel('General Surgery').check(); await expect(page.locator('tbody tr')).toHaveCount(2);
 await page.goto('http://localhost:5173/#reports/health'); await page.getByRole('heading',{name:'Program Health Report',exact:true}).waitFor(); const download=page.waitForEvent('download'); await page.getByRole('button',{name:'Export CSV',exact:true}).click(); assert.equal((await download).suggestedFilename(),'program-health.csv');
 await page.setViewportSize({width:390,height:844}); await page.goto('http://localhost:5173/#health'); await page.waitForTimeout(200); assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)); assert.deepEqual(errors,[]); console.log('Program Health browser checks passed.');
} finally {await browser.close();}
