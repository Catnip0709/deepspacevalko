"""Isolated browser checks for calendar workflows; no real API requests."""
import os
from datetime import datetime, timezone
from playwright.sync_api import sync_playwright, expect

URL = os.environ.get("BASE_URL", "http://localhost:5173")
KEY = "valkophoneCalendar:v1"


def open_calendar(page):
    page.get_by_role("button", name="日历，日历与纪念日", exact=True).click()
    expect(page.get_by_role("heading", name="日历", exact=True)).to_be_visible()


def saved(page):
    return page.evaluate("(key) => JSON.parse(localStorage.getItem(key)).entries", KEY)


with sync_playwright() as p:
    browser = p.chromium.launch()
    context = browser.new_context(viewport={"width": 390, "height": 844}, timezone_id="Asia/Shanghai")
    page = context.new_page()
    page.clock.install(time=datetime(2026, 9, 12, 4, tzinfo=timezone.utc))
    errors, requests = [], []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.route("https://api.deepseek.com/**", lambda route: (requests.append(route.request.url), route.abort()))
    page.goto(URL, wait_until="networkidle")
    page.screenshot(path="/tmp/valkophone-calendar-desktop.png")
    open_calendar(page)
    expect(page.get_by_label("选择月份")).to_have_value("2026-09")
    expect(page.locator('[aria-current="date"]')).to_have_text("12")
    expect(page.locator(".calendar-day")).to_have_count(30)
    assert saved(page) == [{"date": "2026-06-22", "name": "初见"}]

    page.get_by_role("button", name="纪念日", exact=True).click()
    expect(page.locator(".calendar-anniversary")).to_contain_text("初见")
    expect(page.locator(".calendar-day-count")).to_contain_text("82")
    page.screenshot(path="/tmp/valkophone-calendar-anniversaries.png")
    page.get_by_role("button", name="编辑初见，2026年6月22日").click()
    expect(page.get_by_label("选择月份")).to_have_value("2026-06")
    expect(page.get_by_label("纪念日名称")).to_have_value("初见")
    page.get_by_label("纪念日名称").fill("我们的初见")
    page.get_by_role("button", name="保存", exact=True).click()
    expect(page.get_by_role("status")).to_have_text("已保存")
    assert len(saved(page)) == 1
    page.reload(wait_until="networkidle")
    open_calendar(page)
    page.get_by_label("选择月份").fill("2026-06")
    page.get_by_role("button", name="2026年6月22日，我们的初见", exact=True).click()
    expect(page.get_by_label("纪念日名称")).to_have_value("我们的初见")

    page.once("dialog", lambda dialog: dialog.dismiss())
    page.get_by_role("button", name="删除纪念日").click()
    assert len(saved(page)) == 1
    page.once("dialog", lambda dialog: dialog.accept())
    page.get_by_role("button", name="删除纪念日").click()
    assert saved(page) == []
    page.reload(wait_until="networkidle")
    open_calendar(page)
    assert saved(page) == []
    page.get_by_role("button", name="纪念日", exact=True).click()
    expect(page.get_by_text("还没有纪念日", exact=True)).to_be_visible()

    page.get_by_role("button", name="回到今天").click()
    page.get_by_label("纪念日名称").fill("   ")
    expect(page.get_by_role("button", name="保存", exact=True)).to_be_disabled()
    page.get_by_label("纪念日名称").fill("今天的约定")
    page.get_by_role("button", name="保存", exact=True).click()
    page.get_by_role("button", name="2026年9月13日", exact=True).click()
    page.get_by_label("纪念日名称").fill("明天去散步")
    page.get_by_role("button", name="保存", exact=True).click()
    page.get_by_role("button", name="纪念日", exact=True).click()
    expect(page.locator(".calendar-anniversary").nth(0)).to_contain_text("就是今天")
    expect(page.locator(".calendar-anniversary").nth(1).locator(".calendar-day-count")).to_have_text("还有1天")
    # Staying open across midnight updates natural-day counts.
    page.clock.set_system_time(datetime(2026, 9, 12, 16, 0, 1, tzinfo=timezone.utc))
    page.clock.run_for(31000)
    expect(page.locator(".calendar-anniversary").nth(0).locator(".calendar-day-count")).to_have_text("已过1天")
    expect(page.locator(".calendar-anniversary").nth(1)).to_contain_text("就是今天")

    page.get_by_role("button", name="日历", exact=True).click()
    page.get_by_label("选择月份").fill("2026-01")
    expect(page.get_by_role("button", name="上个月")).to_be_disabled()
    expect(page.locator(".calendar-grid > *").nth(3)).to_have_text("1")
    page.get_by_label("选择月份").fill("2026-12")
    page.get_by_role("button", name="下个月").click()
    expect(page.get_by_label("选择月份")).to_have_value("2027-01")
    page.get_by_role("button", name="上个月").click()
    expect(page.get_by_label("选择月份")).to_have_value("2026-12")
    page.get_by_label("选择月份").fill("2028-02")
    expect(page.locator(".calendar-day")).to_have_count(29)
    page.get_by_role("button", name="2028年2月29日", exact=True).click()
    page.get_by_label("纪念日名称").fill("A" * 60)
    page.get_by_role("button", name="保存", exact=True).click()
    page.get_by_role("button", name="纪念日", exact=True).click()
    expect(page.locator(".calendar-anniversary")).to_have_count(3)

    for width, height in [(320, 640), (390, 844), (1280, 900)]:
        page.set_viewport_size({"width": width, "height": height})
        for tab in ["纪念日", "日历"]:
            page.get_by_role("button", name=tab, exact=True).click()
            expect(page.get_by_role("button", name=tab, exact=True)).to_be_visible()
            assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
            assert page.locator(".calendar-content").evaluate("(el) => el.scrollWidth <= el.clientWidth")
            content = page.locator(".calendar-content").bounding_box()
            tabs = page.locator(".calendar-tabs").bounding_box()
            assert content["y"] + content["height"] <= tabs["y"] + 1
            page.screenshot(path=f"/tmp/valkophone-calendar-{tab}-{width}.png")

    # Blocked storage must not claim success or discard the draft.
    page.evaluate("""() => {
      const original = Storage.prototype.setItem;
      window.restoreCalendarStorage = () => { Storage.prototype.setItem = original; };
      Storage.prototype.setItem = function(k, v) {
        if (k === 'valkophoneCalendar:v1') throw new DOMException('Quota', 'QuotaExceededError');
        original.call(this, k, v);
      };
    }""")
    page.get_by_label("纪念日名称").fill("不能丢失的草稿")
    page.get_by_role("button", name="保存", exact=True).click()
    expect(page.get_by_role("alert")).to_be_visible()
    expect(page.get_by_label("纪念日名称")).to_have_value("不能丢失的草稿")
    assert saved(page)[-1]["name"] == "A" * 60
    page.evaluate("window.restoreCalendarStorage()")
    page.get_by_role("button", name="保存", exact=True).click()
    expect(page.get_by_role("alert")).to_have_count(0)
    assert saved(page)[-1]["name"] == "不能丢失的草稿"

    # Invalid stored dates never enter the grid or counts, and are not silently overwritten.
    bad = '{"version":1,"entries":[{"date":"2026-02-30","name":"invalid"}]}'
    page.evaluate("([key,value]) => localStorage.setItem(key,value)", [KEY, bad])
    page.reload(wait_until="networkidle")
    open_calendar(page)
    expect(page.get_by_role("alert")).to_be_visible()
    assert page.evaluate("(key) => localStorage.getItem(key)", KEY) == bad
    page.get_by_role("button", name="纪念日", exact=True).click()
    expect(page.get_by_text("还没有纪念日", exact=True)).to_be_visible()
    assert not requests and not errors, errors

    # Validate local dates and civil-day arithmetic across daylight-saving transitions.
    dst = browser.new_context(timezone_id="America/New_York")
    dst_page = dst.new_page()
    dst_page.goto(URL, wait_until="networkidle")
    result = dst_page.evaluate("""async () => {
      const d = await import('/src/apps/calendar/calendarDates.ts');
      return [
        d.daysSince('2026-03-08', '2026-03-09'),
        d.daysSince('2026-11-01', '2026-11-02'),
        d.daysSince('2026-12-31', '2027-01-01'),
        d.localDateKey(new Date('2026-09-13T01:00:00Z')),
        d.isCalendarDate('2026-02-29'), d.isCalendarDate('2028-02-29'),
        d.isCalendarDate('2025-12-31')
      ];
    }""")
    assert result == [1, 1, 1, "2026-09-12", False, True, False], result
    browser.close()
    print("PASS: calendar CRUD, persistence, default deletion, date bounds, leap year, DST, midnight, layouts, storage errors")
