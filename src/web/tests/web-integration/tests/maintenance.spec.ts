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

// The freshly-booted Testing stack (Postgres + mock OIDC + API + BFF + Vite dev server, all
// cold-starting together) can be transiently flaky in CI for the first few requests -- a 502
// from the reverse proxy while a backend is still warming up, or a page load that resolves
// before the SPA has actually mounted. Both have been observed in CI (a 502 with an empty body
// on vehicle creation, and a blank page body after `goto` that never recovered within the test
// timeout). Retry each of those two operations a few times before giving up for real.
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

async function gotoAndWaitForApp(page: Page, url: string) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    const navResponse = await page.goto(url);
    try {
      await page.getByText("PITSTOP").waitFor({ timeout: 20_000 });
      return;
    } catch {
      // TEMP DEBUG: this has failed persistently in CI even across reload retries -- capture
      // the navigation response status, the resulting URL, and a raw HTML snippet so we can
      // tell whether the server ever served the SPA shell at all versus it failing to mount.
      console.log(
        `[debug] gotoAndWaitForApp(${url}) attempt ${attempt} failed: ` +
          `navStatus=${navResponse?.status()} finalUrl=${page.url()}`,
      );
      console.log(`[debug] html snippet: ${(await page.content()).slice(0, 1500)}`);
      if (attempt === 2) throw new Error(`App shell never rendered at ${url} after 2 attempts`);
    }
  }
}

let vehicleId: number;
let vehicleName: string;

test.beforeEach(async ({ page }) => {
  // This flow does more setup/navigation than the default 30s test timeout budgets for
  // (vehicle creation, an extra vehicle-selection step, and a full CRUD cycle) -- give it
  // headroom so a slower CI agent doesn't trip the timeout mid-flow. Set here (as early as
  // possible in beforeEach) so it covers the rest of this hook too, not just the test body.
  test.setTimeout(90_000);

  await login(page);

  vehicleName = `Maintenance E2E Vehicle ${crypto.randomUUID().replace(/-/g, "")}`;
  const vehicle = await createVehicle(page, vehicleName);
  vehicleId = vehicle.id;

  // The environment may already contain other vehicles, so app-mount auto-selection can
  // land on a vehicle other than the one just created. Select the newly-created vehicle
  // explicitly by its unique name, then navigate via the nav link (client-side route
  // change) rather than a second full page load.
  await gotoAndWaitForApp(page, "/vehicles");
  await page.getByText(vehicleName).click();
  await page.getByRole("link", { name: "Maintenance" }).click();
  await expect(page).toHaveURL(/\/maintenance$/);
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
