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

    // Don't follow the redirect to the IdP: the browser would land back on the SPA, which sees an
    // unauthenticated user and starts a new login, and the mock IdP still has its own session, so
    // it signs the user straight back in. This test is about the proxy ending its session.
    const signOut = await page.request.get("/oauth2/sign_out", { maxRedirects: 0 });
    expect(signOut.status()).toBe(302);
    expect(signOut.headers()["location"]).toContain("/connect/endsession");

    const response = await page.request.get("/oauth2/userinfo");
    expect(response.status()).toBe(401);
  });
});
