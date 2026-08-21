import { expect, test } from "@playwright/test";

test("lists and opens a native Codex thread", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Fake thread")).toBeVisible();
  await page.getByText("Fake thread").click();
  await expect(page.getByText("Fake thread", { exact: true }).last()).toBeVisible();
  await expect(page.getByLabel("Message input")).toBeVisible();
});

test("creates an unmaterialized thread and sends its first message through the assistant composer", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /New Thread/i }).click();
  await expect(page.getByText("Fake thread", { exact: true }).last()).toBeVisible();
  await page.getByLabel("Message input").fill("First message");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.locator("[data-role=user]").getByText("First message", { exact: true })).toBeVisible();
  await expect(page.getByText(/not materialized/)).toHaveCount(0);
});

test("renders the official assistant-ui thread and thread list", async ({ page }) => {
  await page.goto("/");
  await page.getByText("Fake thread").click();
  await expect(page.locator(".aui-thread-root")).toBeVisible();
  await expect(page.locator("[data-slot=aui_thread-list-root]")).toBeVisible();
});
