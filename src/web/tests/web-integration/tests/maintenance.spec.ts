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

async function selectDropdownOption(page: Page, testId: string, optionText: string) {
  await page.getByTestId(testId).locator(".p-dropdown").click();
  // Scope to the open panel: PrimeReact also renders a hidden native <select> whose <option>
  // elements match the role query (e.g. the already-selected value).
  await page.locator(".p-dropdown-panel").getByRole("option", { name: optionText, exact: true }).click();
}

// The freshly-booted Testing stack (Postgres + mock OIDC + API + BFF, all cold-starting
// together) can be transiently flaky in CI for the very first requests -- a 502 from the
// reverse proxy while a backend is still warming up. Retry before giving up for real.
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
  // This flow does more setup/navigation than the default 30s test timeout budgets for
  // (vehicle creation, an extra vehicle-selection step, and a full CRUD cycle) -- give it
  // headroom so a slower CI agent doesn't trip the timeout mid-flow. Set here (as early as
  // possible in beforeEach) so it covers the rest of this hook too, not just the test body.
  test.setTimeout(60_000);

  await login(page);

  vehicleName = `Maintenance E2E Vehicle ${crypto.randomUUID().replace(/-/g, "")}`;
  const vehicle = await createVehicle(page, vehicleName);
  vehicleId = vehicle.id;

  // The environment may already contain other vehicles, so app-mount auto-selection can
  // land on a vehicle other than the one just created. Select the newly-created vehicle
  // explicitly by its unique name, then navigate via the nav link (client-side route
  // change) rather than a second full page load.
  await page.goto("/vehicles");
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
  await selectDropdownOption(page, "service-type-0", "Recall");
  await page.getByLabel("Covered under warranty").check();
  await page.getByTestId("description-0").locator("input").fill("Airbag recall E2E test");

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

async function fillCost(page: Page, testId: string, value: string) {
  const input = page.getByTestId(testId).locator("input");
  await input.fill(value);
  await input.press("Tab");
}

test("record several services on one visit with per-item cost and warranty", async ({ page }) => {
  await page.getByRole("button", { name: "Add" }).click();
  await expect(page).toHaveURL(/\/maintenance\/new$/);

  await page.getByTestId("odometer-reading").locator("input").fill("52000");

  // Service 1: oil change, parts + labor
  await selectDropdownOption(page, "service-type-0", "Oil Change");
  await fillCost(page, "parts-cost-0", "30");
  await fillCost(page, "labor-cost-0", "20");

  // Service 2: tire rotation, total-cost override
  await page.getByRole("button", { name: "Add another service" }).click();
  await selectDropdownOption(page, "service-type-1", "Tire Rotation");
  await fillCost(page, "total-cost-1", "25");

  // Service 3: recall repair covered by warranty
  await page.getByRole("button", { name: "Add another service" }).click();
  await selectDropdownOption(page, "service-type-2", "Recall");
  await page.getByTestId("description-2").locator("input").fill("Fuel pump recall E2E");
  await page.getByTestId("service-item-2").getByLabel("Covered under warranty").check();

  await expect(page.getByTestId("visit-total")).toHaveText("Visit total: $75.00");

  await page.getByRole("button", { name: "Add Maintenance Log" }).click();
  await expect(page).toHaveURL(/\/maintenance$/);

  // One visit row listing every service; only the recall item carries the warranty badge.
  const rows = page.locator("table tbody tr");
  await expect(rows).toHaveCount(1);
  const row = rows.first();
  await expect(row).toContainText("Oil Change");
  await expect(row).toContainText("Tire Rotation");
  await expect(row).toContainText("Recall");
  await expect(row).toContainText("$75.00");
  await expect(row).toContainText("52,000 mi");
  await expect(row.getByText("Warranty")).toHaveCount(1);
});

test("filtering by service type matches any service on the visit", async ({ page }) => {
  await page.request.post(`/pitstop/api/v1/Vehicles/${vehicleId}/maintenance`, {
    data: {
      serviceDate: "2026-02-01",
      odometerReading: 30000,
      performedBy: "Shop",
      items: [{ serviceType: "OilChange" }, { serviceType: "TireRotation" }],
    },
  });
  await page.request.post(`/pitstop/api/v1/Vehicles/${vehicleId}/maintenance`, {
    data: {
      serviceDate: "2026-03-01",
      odometerReading: 31000,
      performedBy: "Self",
      items: [{ serviceType: "WiperBlades" }],
    },
  });
  await page.reload();
  await expect(page.locator("table tbody tr")).toHaveCount(2);

  const typeFilter = page.locator(".p-dropdown", { hasText: "All types" });
  await typeFilter.click();
  await page.locator(".p-dropdown-panel").getByRole("option", { name: "Tire Rotation", exact: true }).click();

  // The two-service visit matches via its second item; the wiper-blade visit is filtered out.
  const rows = page.locator("table tbody tr");
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Oil Change");
  await expect(rows.first()).toContainText("Tire Rotation");
});

test("editing a visit can remove and change individual services", async ({ page }) => {
  const created = await page.request.post(`/pitstop/api/v1/Vehicles/${vehicleId}/maintenance`, {
    data: {
      serviceDate: "2026-02-01",
      odometerReading: 40000,
      performedBy: "Shop",
      items: [
        { serviceType: "OilChange", totalCost: 60 },
        { serviceType: "BrakePads", totalCost: 200 },
      ],
    },
  });
  const { id } = await created.json();
  await page.reload();

  const row = page.locator("table tbody tr", { hasText: "Brake Pads" });
  await expect(row).toContainText("$260.00");
  await row.getByRole("button", { name: "Edit maintenance log" }).click();
  await expect(page).toHaveURL(new RegExp(`/maintenance/${id}/edit$`));

  // Both services are loaded into the form.
  await expect(page.getByTestId("service-item-0")).toBeVisible();
  await expect(page.getByTestId("service-item-1")).toBeVisible();

  await page.getByRole("button", { name: "Remove service 2" }).click();
  await expect(page.getByTestId("service-item-1")).toHaveCount(0);
  await selectDropdownOption(page, "service-type-0", "Air Filter");
  await page.getByRole("button", { name: "Save Changes" }).click();
  await expect(page).toHaveURL(/\/maintenance$/);

  const updated = page.locator("table tbody tr");
  await expect(updated).toHaveCount(1);
  await expect(updated).toContainText("Air Filter");
  await expect(updated).not.toContainText("Brake Pads");
  await expect(updated).toContainText("$60.00");
});
