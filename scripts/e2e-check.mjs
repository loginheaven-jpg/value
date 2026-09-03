/**
 * 실기 점검 — 진짜 브라우저로 재는 7항목.
 *
 * `tsc`·vitest·빌드가 잡지 못하는 것들이다: 인쇄 매체에서의 가시성, 페이지 분할,
 * 375px 실제 레이아웃, 키보드, 화면 상태 복귀.
 *
 *   pnpm build && node scripts/e2e-check.mjs
 *
 * Playwright 를 의존성으로 넣지 않는다. 이미 있으면 쓰고 없으면 **건너뛴다**(exit 0).
 * CI 에 강제하고 싶으면 E2E_REQUIRED=1 을 준다.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const DIST = path.join(ROOT, "dist/public");

const require = createRequire(import.meta.url);

/** node_modules → npx 캐시 순으로 찾는다. */
function loadPlaywright() {
  const candidates = [];
  if (process.env.PLAYWRIGHT_PATH) candidates.push(process.env.PLAYWRIGHT_PATH);
  candidates.push("playwright", path.join(ROOT, "node_modules/playwright"));

  const npxCache = path.join(
    process.env.LOCALAPPDATA ?? process.env.HOME ?? "",
    process.platform === "win32" ? "npm-cache/_npx" : ".npm/_npx"
  );
  if (fs.existsSync(npxCache)) {
    for (const dir of fs.readdirSync(npxCache)) {
      const p = path.join(npxCache, dir, "node_modules/playwright");
      if (fs.existsSync(p)) candidates.push(p);
    }
  }

  for (const c of candidates) {
    try {
      return require(c);
    } catch {
      /* 다음 후보 */
    }
  }
  return null;
}

const pw = loadPlaywright();
if (!pw) {
  const msg = "Playwright 를 찾지 못했습니다. 실기 점검을 건너뜁니다.";
  if (process.env.E2E_REQUIRED) {
    console.error(msg + " (E2E_REQUIRED 가 설정되어 실패로 처리합니다)");
    process.exit(1);
  }
  console.log(msg);
  process.exit(0);
}
const { chromium } = pw;

if (!fs.existsSync(path.join(DIST, "index.html"))) {
  console.error("dist/public 이 없습니다. 먼저 `pnpm build` 를 실행하세요.");
  process.exit(1);
}

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

const server = http.createServer((req, res) => {
  let url;
  try {
    url = decodeURIComponent(req.url.split("?")[0]);
  } catch {
    url = req.url.split("?")[0];
  }
  let file = path.join(DIST, url);
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, "index.html");
  res.writeHead(200, { "content-type": TYPES[path.extname(file)] ?? "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});

const results = [];
const record = (n, name, pass, detail) => {
  results.push({ n, name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${n}. ${name}\n      ${detail}`);
};

await new Promise((r) => server.listen(0, r));
const BASE = `http://127.0.0.1:${server.address().port}`;
console.log("serving", DIST, "at", BASE, "\n");

const browser = await chromium.launch();

try {
  // ── 3. 모바일 375px — 분류 화면이 한 화면에 들어오는가 ──────────────────
  {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 667 } });
    const page = await ctx.newPage();
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    await page.getByLabel(/이름/).fill("점검");
    await page.getByLabel(/이메일/).fill("check@example.com");
    await page.getByRole("button", { name: /가치 발견 시작하기/ }).click();
    await page.waitForURL(/\/sort/);
    await page.waitForSelector("text=/장 중 .*장째/", { timeout: 15000 });

    const buttons = page.getByRole("button", { name: /^(아니요|글쎄요|네)$/ });
    const count = await buttons.count();
    const boxes = [];
    for (let i = 0; i < count; i++) boxes.push(await buttons.nth(i).boundingBox());
    const lowest = Math.max(...boxes.map((b) => b.y + b.height));
    const tapOk = boxes.every((b) => b.height >= 44);

    record(
      3,
      "모바일 375px — 카드와 세 버튼이 한 화면에",
      count === 3 && lowest <= 667 && tapOk,
      `버튼 ${count}개, 최하단 y=${Math.round(lowest)}/667, 최소높이 ${Math.round(Math.min(...boxes.map((b) => b.height)))}px`
    );

    // ── 4. 키보드 ──────────────────────────────────────────────────────────
    const yesCount = async () =>
      Number((await page.locator("text=/지금까지 고른 카드/").innerText()).match(/(\d+)장/)[1]);
    const position = async () =>
      Number((await page.locator("text=/장 중 .*장째/").innerText()).match(/중 (\d+)장째/)[1]);

    const p0 = await position();
    await page.keyboard.press("ArrowRight");
    const afterYes = await yesCount();
    const p1 = await position();

    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowDown");
    const p3 = await position();

    await page.keyboard.press("Backspace");
    const p4 = await position();

    // Alt+← 는 브라우저 뒤로가기다. 삼켜서 카드를 '아니요'로 보내면 안 된다.
    const beforeAlt = await position();
    await page.keyboard.press("Alt+ArrowLeft").catch(() => {});
    await page.waitForTimeout(300);
    const stillOnSort = page.url().includes("/sort");
    const afterAlt = stillOnSort ? await position().catch(() => -1) : -1;

    record(
      4,
      "키보드 — 화살표·Backspace·수식키",
      p1 === p0 + 1 && afterYes === 1 && p3 === p0 + 3 && p4 === p0 + 2 && afterAlt !== beforeAlt + 1,
      `→ ${p0}→${p1}(고른 카드 ${afterYes}), ←↓ →${p3}, Backspace →${p4}, Alt+← 가 판단으로 새지 않음=${afterAlt !== beforeAlt + 1}`
    );

    await ctx.close();
  }

  // ── 6. 검토 화면 — 해제 시 원래 더미로 복귀 ────────────────────────────
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(BASE + "/", { waitUntil: "networkidle" });

    // 큐를 다 소진해 하한 미달로 검토 화면에 떨어지는 상태를 심는다.
    // 11장 yes, 1장 maybe → topUp(need 1). maybe 카드를 눌렀다 떼면 maybe 로 돌아와야 한다.
    await page.evaluate(() => {
      const decisions = {};
      for (let i = 1; i <= 11; i++) decisions[i] = "yes";
      decisions[12] = "maybe";
      for (let i = 13; i <= 72; i++) decisions[i] = "no";
      localStorage.setItem("user-name", "점검");
      localStorage.setItem("user-email", "check@example.com");
      localStorage.setItem(
        "values-triage",
        JSON.stringify({
          round: 1,
          queueIds: [],
          decisions,
          history: [],
          topUpOrigin: decisions,
          phase: "review",
          timestamp: Date.now(),
        })
      );
    });
    await page.goto(BASE + "/sort", { waitUntil: "networkidle" });
    await page.waitForSelector("text=/조금만 더 골라 주세요/", { timeout: 15000 });

    const card12 = JSON.parse(fs.readFileSync(path.join(DIST, "values.json"), "utf8")).find(
      (v) => v.id === 12
    ).korean;
    const maybeHeading = page.locator("text=/글쎄요에 두신 카드/");
    const before = await maybeHeading.innerText();

    // 보류 카드를 눌러 '네'로 올린다 → 보류 목록에서 빠진다
    const maybeCard = page.locator("section", { has: maybeHeading }).getByRole("button").first();
    await maybeCard.click();
    await page.waitForTimeout(200);
    const chosenAfterAdd = await page.locator("text=/고른 카드 \\(/").innerText();

    // 고른 카드에서 같은 카드를 다시 눌러 뺀다 → 원래 더미(글쎄요)로 돌아와야 한다
    const chosenSection = page.locator("section", { has: page.locator("text=/고른 카드 \\(/") });
    await chosenSection.getByRole("button", { name: new RegExp(card12) }).click();
    await page.waitForTimeout(200);
    const afterRemove = await maybeHeading.innerText().catch(() => "(없음)");

    record(
      6,
      "검토 화면 — 해제하면 원래 더미로 복귀",
      before === "글쎄요에 두신 카드 (1장)" && chosenAfterAdd.includes("12장") && afterRemove === before,
      `추가 전 "${before}" → 고른 카드 "${chosenAfterAdd}" → 해제 후 "${afterRemove}"`
    );

    await ctx.close();
  }

  // ── 1·2. 인쇄 ──────────────────────────────────────────────────────────
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(BASE + "/", { waitUntil: "networkidle" });

    const values = JSON.parse(fs.readFileSync(path.join(DIST, "values.json"), "utf8"));
    await page.evaluate((three) => {
      localStorage.setItem("user-name", "점검");
      localStorage.setItem("user-email", "check@example.com");
      localStorage.setItem("values-final", JSON.stringify(three));
      sessionStorage.setItem("values-saved-to-db", "true");
    }, values.slice(0, 3));

    await page.goto(BASE + "/result", { waitUntil: "networkidle" });
    await page.waitForSelector(".reflection-section", { state: "attached", timeout: 15000 });

    const sections = page.locator(".reflection-section");
    const total = await sections.count();
    const screen = [];
    for (let i = 0; i < total; i++) screen.push(await sections.nth(i).isVisible());

    await page.emulateMedia({ media: "print" });
    const printed = [];
    for (let i = 0; i < total; i++) printed.push(await sections.nth(i).isVisible());

    const questionsPrinted = await page.locator(".reflection-section p").count();
    const btnHidden = await page
      .getByRole("button", { name: /인쇄 · PDF로 저장/ })
      .isVisible()
      .catch(() => false);

    record(
      1,
      "인쇄 — 접힌 성찰 질문이 모두 출력",
      total === 3 && screen.every((v) => !v) && printed.every((v) => v),
      `블록 ${total}개, 화면(접힘) ${JSON.stringify(screen)} → 인쇄 ${JSON.stringify(printed)}, 인쇄 매체에서 버튼 숨김=${!btnHidden}, 질문 문단 ${questionsPrinted}개`
    );

    const breakStyle = await page
      .locator(".print-keep")
      .first()
      .evaluate((el) => {
        const s = getComputedStyle(el);
        return { breakInside: s.breakInside, pageBreakInside: s.pageBreakInside };
      });
    record(
      2,
      "페이지 분할 — 카드 중간에서 잘리지 않음",
      breakStyle.breakInside === "avoid" || breakStyle.pageBreakInside === "avoid",
      `.print-keep break-inside=${breakStyle.breakInside} page-break-inside=${breakStyle.pageBreakInside}`
    );

    await page.emulateMedia({ media: "screen" });

    // 인쇄 버튼 폭 은닉 (D-7)
    const deskVisible = await page.getByRole("button", { name: /인쇄 · PDF로 저장/ }).isVisible();
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(200);
    const mobVisible = await page.getByRole("button", { name: /인쇄 · PDF로 저장/ }).isVisible();
    const mobNotice = await page.locator("text=/결과를 복사해 메모장이나 메시지에 붙여 두세요/").isVisible();

    record(
      "1b",
      "인쇄 버튼 폭 은닉 + 모바일 복사 안내 (D-7·C-5)",
      deskVisible && !mobVisible && mobNotice,
      `1280px 노출=${deskVisible}, 375px 노출=${mobVisible}, 375px 복사안내=${mobNotice}`
    );

    await ctx.close();
  }

  // ── 5. 관리자 잠금 (라우터 레벨은 vitest 가 잰다. 화면 게이트만 본다) ──
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(BASE + "/admin", { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    const body = await page.locator("body").innerText();
    const leaked = /@[a-z0-9.-]+\.[a-z]{2,}/i.test(body);
    record(
      5,
      "관리자 화면 — 비로그인 상태에서 데이터 노출 없음",
      !leaked,
      `본문에 이메일 형태 문자열 ${leaked ? "발견" : "없음"} · 화면 첫 줄 "${body.split("\n").filter(Boolean)[0] ?? ""}"`
    );
    await ctx.close();
  }
} finally {
  await browser.close();
  server.close();
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${"=".repeat(60)}\n${results.length - failed.length}/${results.length} 통과`);
if (failed.length) {
  console.log("실패:", failed.map((f) => f.n).join(", "));
  process.exitCode = 1;
}
