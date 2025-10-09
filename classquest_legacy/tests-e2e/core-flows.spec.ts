import { test, expect } from '@playwright/test';

const selectors = {
  manageTab: /verwalten|manage/i,
  awardTab: /vergeben|award/i,
  addStudentButton: /hinzufügen|add/i,
  addQuestButton: /quest anlegen|create quest/i,
  exportButton: /daten exportieren|export data/i,
  importButton: /daten importieren|import data/i,
  undoButton: /letzte vergabe rückgängig machen|undo last/i,
};

test.describe('Core flows', () => {
  test('first run → add student/quest → award → undo → export/import', async ({ page }) => {
    await page.goto('/');

    const nameInput = page.getByLabel(/Klassenname|Class name/i);
    if (await nameInput.isVisible()) {
      await nameInput.fill('4a');
      await page.getByRole('button', { name: /weiter|continue/i }).click();
    }

    await page.getByRole('tab', { name: selectors.manageTab }).click();
    await page.getByPlaceholder(/^Alias$/i).fill('Lena');
    await page.getByRole('button', { name: selectors.addStudentButton }).click();
    await page.getByLabel(/Questname/i).first().fill('Hausaufgaben');
    await page.getByLabel(/^XP$/i).first().fill('10');
    await page.getByRole('button', { name: selectors.addQuestButton }).click();

    await page.getByRole('tab', { name: selectors.awardTab }).click();
    await page.getByRole('radio').first().click();
    await page.getByRole('button', { name: /lena/i }).click();

    const undoToast = page.getByText(/drücke u/i);
    await expect(undoToast).toBeVisible();
    await page.keyboard.press('KeyU');
    await expect(undoToast).toBeHidden({ timeout: 2000 });

    const paletteShortcut = process.platform === 'darwin' ? 'Meta+K' : 'Control+K';
    await page.keyboard.press(paletteShortcut);
    const paletteDialog = page.getByRole('dialog');
    await expect(paletteDialog).toBeVisible();
    await paletteDialog.getByRole('textbox', { name: /befehl suchen/i }).fill('Verwalten');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: /schüler verwalten/i })).toBeVisible();

    await page.keyboard.press('Digit1');
    await expect(page.getByRole('tab', { name: selectors.awardTab })).toHaveAttribute('aria-selected', 'true');

    await page.getByRole('tab', { name: selectors.manageTab }).click();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: selectors.exportButton }).click(),
    ]);
    const path = await download.path();
    expect(path).toBeTruthy();

    await page.reload();
    await page.getByRole('tab', { name: selectors.manageTab }).click();
    const chooserPromise = page.waitForEvent('filechooser');
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: selectors.importButton }).click();
    const chooser = await chooserPromise;
    await chooser.setFiles((await download.path())!);
    await expect(page.getByText(/Daten importiert|imported/i)).toBeVisible({ timeout: 5000 });
  });
});
