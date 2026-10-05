import { test, expect } from "@playwright/test";

const MOCK_USERNAME = "testuser";
const MOCK_PASSWORD = "Test123!";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/oauth2/sign_in");
  await page.getByLabel("Username").fill(MOCK_USERNAME);
  await page.getByLabel("Password").fill(MOCK_PASSWORD);
  await page.getByRole("button", { name: "Login" }).click();
  await page.waitForURL((url) => url.hostname === "localhost" && url.port === "9080");
}

test.describe("OIDC login via mock IdP", () => {
  test("before login, /oauth2/userinfo returns 401", async ({ request }) => {
    const response = await request.get("/oauth2/userinfo");
    expect(response.status()).toBe(401);
  });

  test("logs in and /oauth2/userinfo returns 200 with expected claims", async ({ page }) => {
    await login(page);

    const response = await page.request.get("/oauth2/userinfo");
    expect(response.status()).toBe(200);
    const body = await response.json();
    // The mock IdP's id_token only carries standard claims (sub, iss, ...) unless the client is
    // configured to always include user claims — sub is the reliable "who logged in" signal here.
    expect(body.sub).toBe("1");
    expect(body.iss).toBe("http://localhost:8200");
  });

  test("logs out and /oauth2/userinfo returns 401 again", async ({ page }) => {
    await login(page);

    await page.goto("/oauth2/sign_out");

    const response = await page.request.get("/oauth2/userinfo");
    expect(response.status()).toBe(401);
  });
});
