import { test, expect, type Page } from "@playwright/test";

const MOCK_USERNAME = "testuser";
const MOCK_PASSWORD = "Test123!";

async function login(page: Page) {
  await page.goto("/.auth/login");
  await page.getByLabel("Username").fill(MOCK_USERNAME);
  await page.getByLabel("Password").fill(MOCK_PASSWORD);
  await page.getByRole("button", { name: "Login" }).click();
  await page.waitForURL((url) => url.hostname === "localhost" && url.port === "9080");
}

async function selectDropdownOption(page: Page, testId: string, optionText: string) {
  await page.getByTestId(testId).locator(".p-dropdown").click();
  await page.getByRole("option", { name: optionText, exact: true }).click();
}

let vehicleId: number;

test.beforeEach(async ({ page }) => {
  await login(page);

  const response = await page.request.post("/pitstop/api/v1/Vehicles", {
    data: {
      name: `Maintenance E2E Vehicle ${crypto.randomUUID().replace(/-/g, "")}`,
      year: 2024,
      make: "Ford",
      model: "Bronco",
      startDate: "2024-01-01",
    },
  });
  const vehicle = await response.json();
  vehicleId = vehicle.id;

  // Vehicles fetch (and auto-select of the only vehicle) happens on app mount, so a fresh
  // navigation is needed for the newly-created vehicle to become the selected one.
  await page.goto("/maintenance");
});

test.afterEach(async ({ page }) => {
  await page.request.delete(`/pitstop/api/v1/Vehicles/${vehicleId}`);
});

test("create, edit, and delete a maintenance log through the UI", async ({ page }) => {
  await page.getByRole("button", { name: "Add" }).click();
  await expect(page).toHaveURL(/\/maintenance\/new$/);

  await page.getByTestId("odometer-reading").locator("input").fill("45230");
  await selectDropdownOption(page, "service-type", "Recall");
  await page.getByLabel("Covered under warranty").check();
  await page.getByTestId("description").locator("textarea").fill("Airbag recall E2E test");

  await page.getByRole("button", { name: "Add Maintenance Log" }).click();
  await expect(page).toHaveURL(/\/maintenance$/);

  const row = page.locator("table tbody tr", { hasText: "Recall" });
  await expect(row).toBeVisible();
  await expect(row).toContainText("Warranty");
  await expect(row).toContainText("45,230 mi");
  await expect(row).toContainText("Self");

  await row.getByRole("button", { name: "Edit maintenance log" }).click();
  await expect(page).toHaveURL(/\/maintenance\/\d+\/edit$/);

  await selectDropdownOption(page, "performed-by", "Shop");
  await page.getByRole("button", { name: "Save Changes" }).click();
  await expect(page).toHaveURL(/\/maintenance$/);

  const updatedRow = page.locator("table tbody tr", { hasText: "Recall" });
  await expect(updatedRow).toContainText("Shop");
  await expect(updatedRow).toContainText("Warranty");

  await updatedRow.getByRole("button", { name: "Delete maintenance log" }).click();
  await page.getByRole("button", { name: "Yes" }).click();

  await expect(page.getByText("No maintenance logs recorded yet.")).toBeVisible();
});
