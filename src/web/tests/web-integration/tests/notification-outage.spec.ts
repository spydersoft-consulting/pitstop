import { test, expect, type Page, type Route } from "@playwright/test";

const MOCK_USERNAME = "testuser";
const MOCK_PASSWORD = "Test123!";

async function login(page: Page) {
  await page.goto("/oauth2/sign_in");
  await page.getByLabel("Username").fill(MOCK_USERNAME);
  await page.getByLabel("Password").fill(MOCK_PASSWORD);
  await page.getByRole("button", { name: "Login" }).click();
  await page.waitForURL((url) => url.hostname === "localhost" && url.port === "9080");
}

const outages: Record<string, (route: Route) => Promise<void>> = {
  "is unreachable": (route) => route.abort("connectionrefused"),
  "answers 502": (route) => route.fulfill({ status: 502, contentType: "text/html", body: "<html>Bad Gateway</html>" }),
  "answers 200 with a non-JSON page": (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: "<html>not the notification api</html>" }),
};

for (const [description, handler] of Object.entries(outages)) {
  test(`app still loads when the notification service ${description}`, async ({ page }) => {
    test.setTimeout(60_000);
    await login(page);

    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.stack ?? error.message));
    await page.route("**/notification/**", handler);
    await page.route("**/notification-hub/**", handler);

    await page.goto("/");

    await expect(page.getByRole("navigation")).toBeVisible();
    await expect(page.getByRole("link", { name: "Vehicles" })).toBeVisible();
    expect(pageErrors).toEqual([]);
  });
}
