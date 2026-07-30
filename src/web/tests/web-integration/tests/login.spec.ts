import { test, expect } from "@playwright/test";

const MOCK_USERNAME = "testuser";
const MOCK_PASSWORD = "Test123!";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/.auth/login");
  await page.getByLabel("Username").fill(MOCK_USERNAME);
  await page.getByLabel("Password").fill(MOCK_PASSWORD);
  await page.getByRole("button", { name: "Login" }).click();
  await page.waitForURL((url) => url.hostname === "localhost" && url.port === "9080");
}

test.describe("OIDC login via mock IdP", () => {
  test("before login, /.auth/me returns 401", async ({ request }) => {
    const response = await request.get("/.auth/me");
    expect(response.status()).toBe(401);
  });

  test("logs in and /.auth/me returns 200 with expected claims", async ({ page }) => {
    await login(page);

    const response = await page.request.get("/.auth/me");
    expect(response.status()).toBe(200);
    const body = await response.json();
    // The mock IdP's id_token only carries standard claims (sub, iss, ...) unless the client is
    // configured to always include user claims — sub is the reliable "who logged in" signal here.
    expect(body.sub).toBe("1");
    expect(body.iss).toBe("http://localhost:8200");
  });

  test("logs out and /.auth/me returns 401 again", async ({ page }) => {
    await login(page);

    await page.goto("/.auth/end-session");

    const response = await page.request.get("/.auth/me");
    expect(response.status()).toBe(401);
  });
});
