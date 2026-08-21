import { expect, test } from "@playwright/test";

test("lists and opens a native Codex thread", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Fake thread")).toBeVisible();
  await page.getByText("Fake thread").click();
  await expect(page.getByRole("heading", { name: "Fake thread" })).toBeVisible();
  await expect(page.getByPlaceholder("Ask Codex…")).toBeVisible();
});

test("creates an unmaterialized thread and sends its first message through the assistant composer", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /New thread/ }).click();
  await expect(page.getByRole("heading", { name: "Fake thread" })).toBeVisible();
  await page.getByPlaceholder("Ask Codex…").fill("First message");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.locator(".message-text", { hasText: "First message" })).toBeVisible();
  await expect(page.getByText(/not materialized/)).toHaveCount(0);
});
