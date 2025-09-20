import { test, expect, Page } from '@playwright/test';

async function openManageTab(page: Page) {
  await page.goto('/');
  const nameInput = page.getByLabel(/Klassenname|Class name/i);
  if (await nameInput.isVisible()) {
    await nameInput.fill('Testklasse');
    await page.getByRole('button', { name: /weiter|continue/i }).click();
  }
  await page.getByRole('tab', { name: /verwalten|manage/i }).click();
}

test.describe('Image uploads', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.clear();
      try {
        const request = indexedDB.deleteDatabase('classquest-blobs');
        request.onerror = () => undefined;
      } catch {
        // ignore
      }
    });
  });

  test('class star icon upload and removal', async ({ page }) => {
    await openManageTab(page);

    const chooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Stern-Icon wählen' }).click();
    const chooser = await chooserPromise;
    const pngData = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/lIadAAAAAElFTkSuQmCC',
      'base64',
    );
    await chooser.setFiles({ name: 'star.png', mimeType: 'image/png', buffer: pngData });

    await expect(page.getByAltText('Stern-Icon Vorschau')).toBeVisible();

    await page.getByRole('button', { name: 'Stern-Icon entfernen' }).click();
    await expect(page.getByAltText('Stern-Icon Vorschau')).toHaveCount(0);
  });

  test('student avatar upload for stage 0', async ({ page }) => {
    await openManageTab(page);

    await page.getByPlaceholder(/^Alias$/i).fill('Lena');
    await page.getByRole('button', { name: /hinzufügen|add/i }).click();

    await page.getByRole('radio', { name: 'Bildpaket' }).first().check();

    const chooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Avatar Stufe 0 wählen' }).click();
    const chooser = await chooserPromise;
    const pngData = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/lIadAAAAAElFTkSuQmCC',
      'base64',
    );
    await chooser.setFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: pngData });

    await expect(page.getByAltText('Avatar-Stufe 0 Vorschau für Lena')).toBeVisible();
  });
});
