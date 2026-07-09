import { test, expect } from "@playwright/test";

// Mock data
const mockStats = {
  newCount: 1,
  inProgressCount: 1,
  closedCount: 1,
  total: 3
};

const mockClients = [
  {
    id: 1,
    name: "Иван Иванов",
    phone: "+79991112233",
    status: "NEW",
    statusDisplayName: "Новый",
    caseDescription: "Раздел имущества",
    deadline: "2026-07-01", // Past date (overdue)
    createdAt: "2026-07-09T14:15:00"
  },
  {
    id: 2,
    name: "Анна Кузнецова",
    phone: "+79994445566",
    status: "IN_PROGRESS",
    statusDisplayName: "В работе",
    caseDescription: "Оформление земли",
    deadline: "2026-09-30",
    createdAt: "2026-07-09T14:20:00"
  },
  {
    id: 3,
    name: "Сергей Петров",
    phone: "+79997778899",
    status: "CLOSED",
    statusDisplayName: "Закрыт",
    caseDescription: "Арбитражный спор",
    deadline: "2026-07-01", // Past date, but status is CLOSED so not overdue
    createdAt: "2026-07-09T14:30:00"
  }
];

test.describe("LawTrack CRM E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    // Setup API mocks
    await page.route("**/api/stats/status-counts", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockStats)
      });
    });

    await page.route("**/api/clients?**", async (route) => {
      const url = new URL(route.request().url());
      const statusParam = url.searchParams.get("status");
      const searchParam = url.searchParams.get("search");

      let filtered = [...mockClients];
      if (statusParam && statusParam !== "ALL") {
        filtered = filtered.filter(c => c.status === statusParam);
      }
      if (searchParam) {
        filtered = filtered.filter(c => 
          c.name.toLowerCase().includes(searchParam.toLowerCase()) ||
          c.phone.includes(searchParam)
        );
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(filtered)
      });
    });

    await page.route("**/api/clients", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockClients)
        });
      } else {
        await route.fallback();
      }
    });

    await page.goto("/");
  });

  test("1. Theme Toggle - should switch light/dark modes", async ({ page }) => {
    const htmlElement = page.locator("html");
    await expect(htmlElement).not.toHaveClass(/dark/);

    const themeButton = page.locator('button[aria-label="Переключить тему оформления"]');
    await themeButton.click();
    await expect(htmlElement).toHaveClass(/dark/);

    await themeButton.click();
    await expect(htmlElement).not.toHaveClass(/dark/);
  });

  test("2. Stats Cards & Select Filters - should filter client list", async ({ page }) => {
    // Initial display check
    await expect(page.locator("table tbody tr")).toHaveCount(3);

    // Filter using select dropdown
    const selectFilter = page.locator("select");
    await selectFilter.selectOption("IN_PROGRESS");
    
    // We expect 1 row for IN_PROGRESS
    await expect(page.locator("table tbody tr")).toHaveCount(1);
    await expect(page.locator("table tbody tr").first()).toContainText("Анна Кузнецова");

    // Click stats card to reset or change filter
    // Let's select "Всего клиентов"
    await page.locator('button:has-text("Всего клиентов")').click();
    await expect(page.locator("table tbody tr")).toHaveCount(3);

    // Select "Новые заявки" card
    await page.locator('button:has-text("Новые заявки")').click();
    await expect(page.locator("table tbody tr")).toHaveCount(1);
    await expect(page.locator("table tbody tr").first()).toContainText("Иван Иванов");
  });

  test("3. Overdue Deadline - should display past deadline in red text", async ({ page }) => {
    // Ivan Ivanov has status NEW and deadline 2026-07-01 (past).
    // It should have the red text (text-rose-600 or text-rose-400) and alert icon.
    const ivanRow = page.locator("tr:has-text('Иван Иванов')");
    await expect(ivanRow).toBeVisible();

    // Check that the deadline cell contains red text
    const deadlineSpan = ivanRow.locator("span.text-rose-600, span.text-rose-400");
    await expect(deadlineSpan).toBeVisible();
    await expect(deadlineSpan).toContainText("01.07.2026");

    // Also verify AlertCircle icon is present
    const alertIcon = ivanRow.locator('span[title="Дедлайн просрочен"]');
    await expect(alertIcon).toBeVisible();
  });

  test("4. Update Status - should send PATCH request and update UI", async ({ page }) => {
    let patchRequestPayload: any = null;

    await page.route("**/api/clients/1/status", async (route) => {
      if (route.request().method() === "PATCH") {
        patchRequestPayload = JSON.parse(route.request().postData() || "{}");
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ...mockClients[0],
            status: "IN_PROGRESS",
            statusDisplayName: "В работе"
          })
        });
      }
    });

    const ivanRow = page.locator("tr:has-text('Иван Иванов')");
    // Find the status badge dropdown trigger inside Ivan's row
    const statusBtn = ivanRow.locator("td").last().locator("button");
    await expect(statusBtn).toContainText("Новый");

    await statusBtn.click();

    // Click "В работе" in the dropdown list
    const inProgressOption = ivanRow.locator('div.absolute button:has-text("В работе")');
    await inProgressOption.click();

    // Expect PATCH request to have been sent
    await expect.poll(() => patchRequestPayload).toEqual({ status: "IN_PROGRESS" });
  });

  test("5. Add Client - should fill form and submit POST request", async ({ page }) => {
    let postRequestPayload: any = null;

    await page.route("**/api/clients", async (route) => {
      if (route.request().method() === "POST") {
        postRequestPayload = JSON.parse(route.request().postData() || "{}");
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            id: 4,
            name: postRequestPayload.name,
            phone: postRequestPayload.phone,
            status: "NEW",
            statusDisplayName: "Новый",
            caseDescription: postRequestPayload.caseDescription,
            deadline: postRequestPayload.deadline,
            createdAt: new Date().toISOString()
          })
        });
      } else {
        await route.fallback();
      }
    });

    // Click Add Client button in header
    await page.locator('button:has-text("Добавить")').first().click();

    // Dialog should be visible
    const dialog = page.locator("form");
    await expect(dialog).toBeVisible();

    // Fill inputs
    await page.fill('input[placeholder="Иванов Иван Иванович"]', "Дмитрий Смирнов");
    await page.fill('input[placeholder="+7 (999) 111-22-33"]', "+79998889988");
    await page.fill('input[type="date"]', "2026-12-31");
    await page.fill('textarea[placeholder="Опишите детали дела, ключевые требования или суть спора..."]', "Уголовное дело");

    // Submit form
    await page.locator('button[type="submit"]:has-text("Создать клиента")').click();

    // Dialog should close
    await expect(dialog).not.toBeVisible();

    // Assert API request payload
    await expect.poll(() => postRequestPayload).toEqual({
      name: "Дмитрий Смирнов",
      phone: "+79998889988",
      deadline: "2026-12-31",
      caseDescription: "Уголовное дело"
    });
  });
});
