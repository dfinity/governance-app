import { expect, type Page, test } from '@playwright/test';

import { openApp } from './utils/app';
import { getIcps } from './utils/getIcps';
import { login } from './utils/login';

const TEST_ICP_ADDRESS = 'd4685b31b51450508aff0331584df7692a84467b680326f5c5f7d30ae711682f';
const TEST_ICRC1_ADDRESS = 'h4a5i-5vcfo-5rusv-fmb6m-vrkia-mjnkc-jpoow-h5mam-nthnm-ldqlr-bqe';

const openAddressBookModal = async (page: Page) => {
  await page.getByTestId('address-book-open-btn').click();
  await expect(page.getByTestId('address-book-modal')).toBeVisible();
};

const addAddress = async (page: Page, nickname: string, address: string) => {
  await page.getByTestId('address-book-add-btn').click();
  await expect(page.getByTestId('add-address-modal')).toBeVisible();

  await page.getByTestId('add-address-nickname-input').fill(nickname);
  await page.getByTestId('add-address-address-input').fill(address);
  await page.getByTestId('add-address-save-btn').click();
  await expect(page.getByTestId('add-address-modal')).not.toBeVisible({ timeout: 30000 });
};

const getEntryNames = async (page: Page): Promise<string[]> => {
  const entries = page.getByTestId('address-book-entry-name');
  return entries.allTextContents();
};

const getEntryAddresses = async (page: Page): Promise<string[]> => {
  const entries = page.getByTestId('address-book-entry-address');
  return entries.allTextContents();
};

test.describe('Address book', () => {
  test('Complete CRUD flow', async ({ page }) => {
    await test.step('Open app and login.', async () => {
      await openApp({ page });
      await login({ page });
      await page.getByRole('link', { name: 'Account' }).click();
    });

    await test.step('Open address book modal and verify empty state.', async () => {
      await openAddressBookModal(page);
      await expect(page.getByTestId('address-book-empty')).toBeVisible();
    });

    await test.step('Add first address (ICP) - "Alice".', async () => {
      await addAddress(page, 'Alice', TEST_ICP_ADDRESS);
      await expect(page.getByText('Address saved successfully.').first()).toBeVisible();

      await expect(page.getByTestId('address-book-empty')).not.toBeVisible({ timeout: 30000 });
      const names = await getEntryNames(page);
      const addresses = await getEntryAddresses(page);
      expect(names).toHaveLength(1);
      expect(names[0]).toBe('Alice');
      expect(addresses).toHaveLength(1);
      expect(addresses[0]).toBe(TEST_ICP_ADDRESS);
    });

    await test.step('Add second address (ICRC1) - "Bob".', async () => {
      await addAddress(page, 'Bob', TEST_ICRC1_ADDRESS);
      await expect(page.getByText('Address saved successfully.').first()).toBeVisible();

      await expect(page.getByTestId('address-book-empty')).not.toBeVisible({ timeout: 30000 });
      const names = await getEntryNames(page);
      const addresses = await getEntryAddresses(page);
      expect(names).toHaveLength(2);
      expect(names[0]).toBe('Alice');
      expect(names[1]).toBe('Bob');
      expect(addresses).toHaveLength(2);
      expect(addresses[0]).toBe(TEST_ICP_ADDRESS);
      expect(addresses[1]).toBe(TEST_ICRC1_ADDRESS);
    });

    await test.step('Edit "Alice" nickname to "Marta".', async () => {
      const aliceEntry = page.getByTestId('address-book-entry').filter({ hasText: 'Alice' });
      await aliceEntry.getByTestId('address-book-edit-btn').click();
      await expect(page.getByTestId('add-address-modal')).toBeVisible();

      await expect(page.getByTestId('add-address-nickname-input')).toHaveValue('Alice');
      await expect(page.getByTestId('add-address-address-input')).toHaveValue(TEST_ICP_ADDRESS);

      await page.getByTestId('add-address-nickname-input').clear();
      await page.getByTestId('add-address-nickname-input').fill('Marta');
      await page.getByTestId('add-address-save-btn').click();

      await expect(page.getByTestId('add-address-modal')).not.toBeVisible({ timeout: 30000 });
      await expect(page.getByText('Address updated successfully.').first()).toBeVisible();

      const names = await getEntryNames(page);
      const addresses = await getEntryAddresses(page);
      expect(names).toHaveLength(2);
      expect(names[0]).toBe('Bob');
      expect(names[1]).toBe('Marta');
      expect(addresses).toHaveLength(2);
      expect(addresses[0]).toBe(TEST_ICRC1_ADDRESS);
      expect(addresses[1]).toBe(TEST_ICP_ADDRESS);
    });

    await test.step('Edit "Marta" address to ICRC1.', async () => {
      let martaEntry = page.getByTestId('address-book-entry').filter({ hasText: 'Marta' });
      await martaEntry.getByTestId('address-book-edit-btn').click();
      await expect(page.getByTestId('add-address-modal')).toBeVisible();

      await page.getByTestId('add-address-address-input').clear();
      await page.getByTestId('add-address-address-input').fill(TEST_ICRC1_ADDRESS);
      await page.getByTestId('add-address-save-btn').click();

      await expect(page.getByTestId('add-address-modal')).not.toBeVisible({ timeout: 30000 });
      await expect(page.getByText('Address updated successfully.').first()).toBeVisible();

      martaEntry = page.getByTestId('address-book-entry').filter({ hasText: 'Marta' });
      const names = await getEntryNames(page);
      const addresses = await getEntryAddresses(page);
      expect(names).toHaveLength(2);
      expect(names[0]).toBe('Bob');
      expect(names[1]).toBe('Marta');
      expect(addresses).toHaveLength(2);
      expect(addresses[0]).toBe(TEST_ICRC1_ADDRESS);
      expect(addresses[1]).toBe(TEST_ICRC1_ADDRESS);
    });

    await test.step('Delete "Bob" - confirm.', async () => {
      const bobEntry = page.getByTestId('address-book-entry').filter({ hasText: 'Bob' });
      await bobEntry.getByTestId('address-book-delete-btn').click();
      await expect(page.getByTestId('remove-address-confirmation')).toBeVisible();
      await expect(page.getByTestId('remove-address-confirmation')).toContainText('Bob');
      await page.getByTestId('remove-address-confirm-btn').click();

      await expect(page.getByTestId('remove-address-confirmation')).not.toBeVisible({
        timeout: 30000,
      });
      await expect(page.getByText('Address removed successfully.').first()).toBeVisible();

      const names = await getEntryNames(page);
      const addresses = await getEntryAddresses(page);
      expect(names).toHaveLength(1);
      expect(names[0]).toBe('Marta');
      expect(addresses).toHaveLength(1);
      expect(addresses[0]).toBe(TEST_ICRC1_ADDRESS);
    });

    await test.step('Delete "Marta" - cancel.', async () => {
      const martaEntry = page.getByTestId('address-book-entry').filter({ hasText: 'Marta' });
      await martaEntry.getByTestId('address-book-delete-btn').click();
      await expect(page.getByTestId('remove-address-confirmation')).toBeVisible();
      await page.getByTestId('remove-address-cancel-btn').click();

      await expect(page.getByTestId('remove-address-confirmation')).not.toBeVisible({
        timeout: 30000,
      });

      const names = await getEntryNames(page);
      const addresses = await getEntryAddresses(page);
      expect(names).toHaveLength(1);
      expect(names[0]).toBe('Marta');
      expect(addresses).toHaveLength(1);
      expect(addresses[0]).toBe(TEST_ICRC1_ADDRESS);
    });

    await test.step('Delete "Marta" - confirm. Back to empty state.', async () => {
      const martaEntry = page.getByTestId('address-book-entry').filter({ hasText: 'Marta' });
      await martaEntry.getByTestId('address-book-delete-btn').click();
      await expect(page.getByTestId('remove-address-confirmation')).toBeVisible();
      await page.getByTestId('remove-address-confirm-btn').click();

      await expect(page.getByTestId('remove-address-confirmation')).not.toBeVisible({
        timeout: 30000,
      });
      await expect(page.getByText('Address removed successfully.').first()).toBeVisible();

      await expect(page.getByTestId('address-book-empty')).toBeVisible();
      const names = await getEntryNames(page);
      const addresses = await getEntryAddresses(page);
      expect(names).toHaveLength(0);
      expect(addresses).toHaveLength(0);
    });
  });

  test('Send ICP with address book', async ({ page }) => {
    await test.step('Open app and login.', async () => {
      await openApp({ page });
      await login({ page });
      await getIcps(page, '20');
    });

    await test.step('Open send dialog - verify no address book toggle.', async () => {
      await page.getByTestId('send-icp-btn').click();
      await expect(page.getByTestId('address-book-toggle')).not.toBeVisible();
      await expect(page.getByText('The address book is empty')).toBeVisible();
      await page.keyboard.press('Escape');
    });

    await test.step('Add 2 addresses to address book.', async () => {
      await page.getByRole('link', { name: 'Account' }).click();
      await openAddressBookModal(page);

      await addAddress(page, 'Wallet A', TEST_ICP_ADDRESS);
      await expect(page.getByText('Address saved successfully.').first()).toBeVisible();

      await addAddress(page, 'Wallet B', TEST_ICRC1_ADDRESS);
      await expect(page.getByText('Address saved successfully.').first()).toBeVisible();

      const names = await getEntryNames(page);
      expect(names).toHaveLength(2);
      expect(names[0]).toBe('Wallet A');
      expect(names[1]).toBe('Wallet B');
      const addresses = await getEntryAddresses(page);
      expect(addresses).toHaveLength(2);
      expect(addresses[0]).toBe(TEST_ICP_ADDRESS);
      expect(addresses[1]).toBe(TEST_ICRC1_ADDRESS);

      await page.keyboard.press('Escape');
    });

    await test.step('Open send dialog - verify toggle is on and dropdown visible.', async () => {
      await page.getByRole('link', { name: 'Dashboard', exact: true }).click();
      await page.getByTestId('send-icp-btn').click();
      await expect(page.getByTestId('address-book-toggle')).toBeVisible();
      await expect(page.getByTestId('address-book-toggle')).toBeChecked();
      await expect(page.getByTestId('address-book-select')).toBeVisible();
    });

    await test.step('Select "Wallet B", fill amount, and submit.', async () => {
      await page.getByTestId('address-book-select').selectOption('Wallet B');
      await page.getByTestId('send-icp-amount-input').fill('5');
      await page.getByTestId('send-icp-confirm-btn').click();

      await expect(page.getByText('successfully sent')).toBeVisible({ timeout: 30000 });
      await expect(page.getByText(TEST_ICRC1_ADDRESS.slice(0, 20))).toBeVisible();
    });
  });
});
