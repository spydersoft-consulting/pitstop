import { test, expect, type Page } from "@playwright/test";

const MOCK_USERNAME = "testuser";
const MOCK_PASSWORD = "Test123!";

async function login(page: Page) {
  await page.goto("/oauth2/sign_in");
  await page.getByLabel("Username").fill(MOCK_USERNAME);
  await page.getByLabel("Password").fill(MOCK_PASSWORD);
  await page.getByRole("button", { name: "Login" }).click();
  await page.waitForURL((url) => url.hostname === "localhost" && url.port === "9080");
}

// The freshly-booted Testing stack can return a transient 502 for the first requests while a
// backend is still warming up. Retry before giving up for real.
async function createVehicle(page: Page, name: string): Promise<{ id: number }> {
  let lastStatus = 0;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const response = await page.request.post("/pitstop/api/v1/Vehicles", {
      data: { name, year: 2024, make: "Ford", model: "Bronco", startDate: "2024-01-01" },
    });
    if (response.ok()) return response.json();
    lastStatus = response.status();
    await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
  }
  throw new Error(`Failed to create vehicle "${name}" after 3 attempts (last status: ${lastStatus})`);
}

let vehicleId: number;
let vehicleName: string;

test.beforeEach(async ({ page }) => {
  test.setTimeout(60_000);

  await login(page);

  vehicleName = `Reminders E2E Vehicle ${crypto.randomUUID().replace(/-/g, "")}`;
  const vehicle = await createVehicle(page, vehicleName);
  vehicleId = vehicle.id;

  // Other vehicles may already exist, so select the new one explicitly by its unique name.
  await page.goto("/vehicles");
  await page.getByText(vehicleName).click();
  await page.getByRole("link", { name: "Reminders" }).click();
  await expect(page).toHaveURL(/\/reminders$/);
});

test.afterEach(async ({ page }) => {
  await page.request.delete(`/pitstop/api/v1/Vehicles/${vehicleId}`);
});

test("add common services, mark one done, edit it, and delete it through the UI", async ({ page }) => {
  await expect(page.getByText("No maintenance reminders yet.")).toBeVisible();

  await page.getByRole("button", { name: "Add common services" }).first().click();
  const picker = page.getByRole("dialog");
  await picker.getByLabel(/Oil change/).check();
  await picker.getByLabel(/Tire rotation/).check();
  await picker.getByRole("button", { name: "Add 2" }).click();

  await expect(page.getByText("Oil change", { exact: true })).toBeVisible();
  await expect(page.getByText("Tire rotation", { exact: true })).toBeVisible();

  // Both start overdue: the vehicle started in 2024 and has no history, so the 6-month interval has lapsed.
  await expect(page.getByText("Overdue")).toHaveCount(2);

  const oilCard = page.locator("div.rounded-xl", { hasText: "Oil change" });
  await oilCard.getByRole("button", { name: "Mark done" }).click();
  const completeDialog = page.getByRole("dialog");
  await completeDialog.getByLabel("Odometer (mi)").fill("12000");
  await completeDialog.getByRole("button", { name: "Mark done" }).click();

  await expect(oilCard.getByText("On track")).toBeVisible();
  await expect(oilCard.getByText(/12,000 mi/).first()).toBeVisible();

  await oilCard.getByRole("button", { name: "Edit Oil change" }).click();
  await expect(page).toHaveURL(/\/reminders\/\d+\/edit$/);
  await page.getByLabel("Repeat every (miles)").fill("7500");
  await page.getByRole("button", { name: "Save Changes" }).click();
  await expect(page).toHaveURL(/\/reminders$/);
  await expect(page.getByText("Every 7,500 mi or 6 mo")).toBeVisible();

  await page.getByRole("button", { name: "Delete Tire rotation" }).click();
  await page.getByRole("button", { name: "Yes" }).click();
  await expect(page.getByText("Tire rotation", { exact: true })).toHaveCount(0);

  // Marking the oil change done also recorded it in Maintenance History.
  await page.getByRole("link", { name: "Maintenance" }).click();
  await expect(page).toHaveURL(/\/maintenance$/);
  await expect(page.getByText("12,000 mi").first()).toBeVisible();
  await expect(page.getByText("Oil Change").first()).toBeVisible();
});

test("add a custom reminder through the form", async ({ page }) => {
  await page.getByRole("button", { name: "Add reminder", exact: true }).first().click();
  await expect(page).toHaveURL(/\/reminders\/new$/);

  await page.getByRole("button", { name: "Add Reminder", exact: true }).click();
  await expect(page.getByText("Set an interval in miles, months, or both.")).toBeVisible();

  await page.getByLabel("Name").fill("Synthetic oil");
  await page.getByLabel("Repeat every (miles)").fill("10000");
  await page.getByRole("button", { name: "Add Reminder", exact: true }).click();

  await expect(page).toHaveURL(/\/reminders$/);
  await expect(page.getByText("Synthetic oil")).toBeVisible();
  await expect(page.getByText("Every 10,000 mi")).toBeVisible();
});
