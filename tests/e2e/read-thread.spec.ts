import { expect, test } from "@playwright/test";

test("lists and opens a native Codex thread", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Fake thread")).toBeVisible();
  await page.getByText("Fake thread").click();
  await expect(page.getByRole("heading", { name: "Fake thread" })).toBeVisible();
  await expect(page.getByPlaceholder("Ask Codex…")).toBeVisible();
});
