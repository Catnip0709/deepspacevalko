"""Calendar notes with intercepted DeepSeek responses, in isolated storage."""
import json
import os
from playwright.sync_api import sync_playwright, expect

URL = os.environ.get("BASE_URL", "http://localhost:5173")
KEY = "valkophoneCalendar:v1"
NOTE = "这一天我记下了，以后的每一次约定也都算数。"


def open_app(page):
    page.get_by_role("button", name="日历，日历与纪念日").click()
    page.get_by_label("选择月份").fill("2026-09")


def add(page, day, name):
    page.get_by_role("button", name="日历", exact=True).click()
    page.get_by_role("button", name=f"2026年9月{day}日", exact=True).click()
    page.get_by_label("纪念日名称").fill(name)
    page.get_by_role("button", name="保存", exact=True).click()


def respond(route, note):
    route.fulfill(status=200, content_type="text/event-stream",
                  body="data: " + json.dumps({"choices": [{"delta": {"content": note}}]}) + "\n\ndata: [DONE]\n\n")


with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 390, "height": 844})
    requests, held, errors = [], [], []
    page.on("pageerror", lambda error: errors.append(str(error)))

    def intercept(route):
        requests.append(route.request.post_data_json)
        held.append(route)

    page.route("https://api.deepseek.com/**", intercept)
    page.goto(URL, wait_until="networkidle")
    page.evaluate("localStorage.setItem('deepseekApiKey', 'TEST_ONLY_NOT_A_REAL_KEY')")
    page.reload(wait_until="networkidle")
    open_app(page)
    assert not requests  # Initial default must not trigger paid requests.
    add(page, 12, "一起看海")
    page.wait_for_timeout(150)
    assert len(requests) == 1
    assert json.loads(requests[0]["messages"][1]["content"])["name"] == "一起看海"
    assert json.loads(requests[0]["messages"][1]["content"])["date"] == "2026-09-12"
    assert "小铃兰" in requests[0]["messages"][0]["content"]
    assert "TEST_ONLY" not in json.dumps(requests)
    # Re-saving the same entry must not duplicate the request.
    page.get_by_role("button", name="保存", exact=True).click()
    page.get_by_role("button", name="纪念日", exact=True).click()
    card = page.locator(".calendar-anniversary").filter(has_text="一起看海")
    expect(card).to_contain_text("敖尹正在写留言")
    assert len(requests) == 1
    # A second event may be created while the first is still pending.
    add(page, 13, "一起散步")
    page.wait_for_timeout(150)
    assert len(requests) == 2
    respond(held.pop(), "散步的路慢慢走，我会一直在你身边。")
    respond(held.pop(), NOTE)
    page.get_by_role("button", name="纪念日", exact=True).click()
    expect(card).to_contain_text(NOTE)
    expect(page.locator(".calendar-anniversary").filter(has_text="一起散步")).to_contain_text("散步的路慢慢走")
    page.reload(wait_until="networkidle")
    open_app(page)
    page.get_by_role("button", name="纪念日", exact=True).click()
    expect(card).to_contain_text(NOTE)
    assert len(requests) == 2

    # Invalid Key: save remains intact, raw errors are never shown; manual retry works.
    add(page, 14, "第一次露营")
    page.wait_for_timeout(150)
    held.pop().fulfill(status=401, body="SECRET_INTERNAL_ERROR")
    page.get_by_role("button", name="纪念日", exact=True).click()
    camping = page.locator(".calendar-anniversary").filter(has_text="第一次露营")
    expect(camping).to_contain_text("留言未能生成")
    assert "SECRET_INTERNAL_ERROR" not in page.locator(".calendar-shell").inner_text()
    camping.get_by_role("button", name="请敖尹留言").click()
    page.wait_for_timeout(150)
    respond(held.pop(), "帐篷留一半给你，夜里的风我来挡。")
    expect(camping).to_contain_text("帐篷留一半给你")

    # Renaming during a request discards its result and leaves a manual note action.
    add(page, 15, "旧约定")
    page.wait_for_timeout(150)
    page.get_by_label("纪念日名称").fill("新约定")
    page.get_by_role("button", name="保存", exact=True).click()
    respond(held.pop(), "这条旧约定的留言不能再显示出来。")
    page.get_by_role("button", name="纪念日", exact=True).click()
    expect(page.locator(".calendar-anniversary").filter(has_text="新约定")).to_contain_text("还没有留言")
    assert "这条旧约定" not in page.locator(".calendar-shell").inner_text()

    # Deleted event must not be revived by a late response.
    add(page, 16, "待删除")
    page.wait_for_timeout(150)
    page.once("dialog", lambda dialog: dialog.accept())
    page.get_by_role("button", name="删除纪念日").click()
    respond(held.pop(), "这条已经删除的纪念日不能回来。")
    page.get_by_role("button", name="纪念日", exact=True).click()
    expect(page.locator(".calendar-anniversary").filter(has_text="待删除")).to_have_count(0)

    # Leaving the app cancels pending work; the saved entry can retry on return.
    add(page, 17, "下次约会")
    page.wait_for_timeout(150)
    page.get_by_role("button", name="返回桌面").click()
    respond(held.pop(), "这条离开后取消的留言不能自动覆盖。")
    open_app(page)
    page.get_by_role("button", name="纪念日", exact=True).click()
    expect(page.locator(".calendar-anniversary").filter(has_text="下次约会")).to_contain_text("还没有留言")

    # Notes wrap on small screens; no nested interactive controls.
    for width in [320, 390, 1280]:
        page.set_viewport_size({"width": width, "height": 844})
        assert page.locator(".calendar-content").evaluate("(el) => el.scrollWidth <= el.clientWidth")
        assert page.locator("button button").count() == 0
        page.screenshot(path=f"/tmp/calendar-notes-{width}.png")

    # Missing key does not prevent saving and never calls DeepSeek.
    page.evaluate("localStorage.removeItem('deepseekApiKey')")
    page.reload(wait_until="networkidle")
    open_app(page)
    before = len(requests)
    add(page, 18, "没有Key也保存")
    page.get_by_role("button", name="纪念日", exact=True).click()
    no_key = page.locator(".calendar-anniversary").filter(has_text="没有Key也保存")
    expect(no_key).to_contain_text("填写 API Key 后")
    no_key.get_by_role("button", name="去设置填写 Key").click()
    expect(page.get_by_role("heading", name="设置", exact=True)).to_be_visible()
    assert len(requests) == before
    records = page.evaluate("(k) => JSON.parse(localStorage.getItem(k)).entries", KEY)
    assert any(e["name"] == "没有Key也保存" for e in records)
    assert any(e.get("aoyinNote") == NOTE for e in records)
    assert not errors, errors
    browser.close()
    print("PASS: note creation, persistence, concurrency, failure/retry, stale responses, cancellation, missing key, layouts")
