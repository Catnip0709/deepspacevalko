"""Run against the local Vite server; all DeepSeek requests are intercepted."""
import json
import os
from playwright.sync_api import sync_playwright, expect

BASE_URL = os.environ.get("BASE_URL", "http://localhost:5173")
KEY = "valkophoneMoments:v1"
TEXT = "雨停了，路边还有一点积水。留着灯，等某个人回来。"
SECOND = "今天收工比平时早，顺路带了些巧克力。还有一份留给你。"


def sse(route, text):
    body = "data: " + json.dumps({"choices": [{"delta": {"content": text}}]}) + "\n\n"
    route.fulfill(status=200, content_type="text/event-stream", body=body + "data: [DONE]\n\n")


def enter(page):
    page.get_by_role("button", name="打开微信", exact=True).click()
    page.get_by_role("button", name="朋友圈", exact=True).click()


def saved(page):
    return page.evaluate("(key) => JSON.parse(localStorage.getItem(key)).moments", KEY)


def seed(page, values):
    page.goto(BASE_URL, wait_until="networkidle")
    page.evaluate("(v) => { localStorage.clear(); for (const [k,x] of Object.entries(v)) localStorage.setItem(k, x); }", values)
    page.reload(wait_until="networkidle")


with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 390, "height": 844})
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    requests = []
    held = []
    replies = []

    def respond(route):
        requests.append(route.request.post_data_json)
        if not replies:
            held.append(route)
        elif replies[0] == "401":
            replies.pop(0)
            route.fulfill(status=401, body="SECRET_INTERNAL_ERROR")
        else:
            sse(route, replies.pop(0))

    page.route("https://api.deepseek.com/**", respond)
    chat = [
        {"id": str(i), "role": "user", "content": f"history-{i}", "createdAt": "12:00"}
        for i in range(20)
    ]
    chat += [
        {"id": "loc", "role": "user", "type": "location", "content": "", "createdAt": "12:00",
         "location": {"place": "东门", "note": "等你一起"}},
        {"id": "red", "role": "assistant", "type": "redPacket", "content": "", "createdAt": "12:01",
         "redPacket": {"amount": "52.00", "note": "喝奶茶"}}
    ]
    history = [{
        "id": "old", "author": "hunter", "authorName": "猎人小姐", "time": "08:00",
        "text": "今天一起看雨。",
        "replies": [{"id": "r", "author": "aoyin", "text": "带上外套。"}]
    }]
    seed(page, {
        "valkophoneUnlocked:v1": "true", "deepseekApiKey": "TEST_ONLY_NOT_A_REAL_KEY",
        "chatMessages:aoyin": json.dumps(chat), KEY: json.dumps(history),
        "valkophoneUnlockCode:v1": "DO_NOT_SEND_THIS"
    })
    enter(page)
    print("Rendered controls:", page.get_by_role("button").all_text_contents())
    button = page.get_by_role("button", name="让敖尹发朋友圈")
    dialogs = []

    def cancel_post(dialog):
        dialogs.append(dialog.message)
        assert dialog.type == "confirm"
        dialog.dismiss()

    page.once("dialog", cancel_post)
    button.click()
    assert dialogs == ["确认让敖尹根据聊天和朋友圈记录发一条新朋友圈吗？"]
    assert not requests and len(saved(page)) == 1
    expect(button).to_be_enabled()
    page.on("dialog", lambda dialog: dialog.accept())
    button.click()
    expect(page.get_by_role("button", name="敖尹正在写朋友圈")).to_be_disabled()
    expect(page.locator(".moment-card")).to_have_count(1)
    page.wait_for_timeout(150)
    assert len(requests) == 1 and len(held) == 1
    context = json.loads(requests[-1]["messages"][1]["content"])
    assert len(context["chat"]) == 22
    assert context["chat"][0]["text"] == "history-0"
    assert context["chat"][-2]["location"]["note"] == "等你一起"
    assert context["chat"][-1]["redPacket"]["amount"] == "52.00"
    assert context["moments"][0]["replies"][0]["text"] == "带上外套。"
    assert "TEST_ONLY" not in json.dumps(requests[-1])
    assert "DO_NOT_SEND_THIS" not in json.dumps(requests[-1])
    assert "send_location" not in json.dumps(requests[-1])
    # Loading remains guarded across tab switches.
    page.get_by_role("button", name="聊天", exact=True).click()
    page.get_by_role("button", name="朋友圈", exact=True).click()
    expect(page.get_by_role("button", name="敖尹正在写朋友圈")).to_be_disabled()
    sse(held.pop(), json.dumps({"text": TEXT, "topic": "daily"}))
    expect(page.locator(".moment-card").first).to_contain_text(TEXT)
    expect(button).to_be_enabled()
    assert saved(page)[0]["createdAt"] > 0
    page.reload(wait_until="networkidle")
    enter(page)
    expect(page.locator(".moment-card").first).to_contain_text(TEXT)
    assert len(saved(page)) == 2

    # Duplicate output is retried, at most one additional request.
    replies.extend([json.dumps({"text": TEXT, "topic": "daily"}), json.dumps({"text": SECOND, "topic": "work"})])
    button.click()
    expect(page.locator(".moment-card").first).to_contain_text(SECOND)
    assert len(requests) == 3
    replies.extend(["not-json", '{"text": "short", "topic": "bad"}'])
    button.click()
    expect(page.get_by_role("alert")).to_be_visible()
    expect(button).to_be_enabled()
    assert len(requests) == 5 and len(saved(page)) == 3
    assert "not-json" not in page.locator(".moments-feed").inner_text()
    replies.append("401")
    button.click()
    expect(button).to_be_enabled()
    expect(page.get_by_role("alert")).to_be_visible()
    assert len(requests) == 6 and len(saved(page)) == 3
    assert "SECRET_INTERNAL_ERROR" not in page.locator(".moments-feed").inner_text()

    # New posts still support normal AI comments and persistent reply history.
    replies.append("外套给你留在门口了。")
    first = page.locator(".moment-card").first
    first.get_by_role("textbox").fill("我马上回去。")
    first.get_by_role("button", name="回复", exact=True).click()
    expect(first).to_contain_text("外套给你留在门口了。")
    page.reload(wait_until="networkidle")
    enter(page)
    expect(page.locator(".moment-card").first).to_contain_text("我马上回去。")
    expect(page.locator(".moment-card").first).to_contain_text("外套给你留在门口了。")

    # Render mobile and desktop, checking actual page overflow and fixed tabs.
    for width, height in [(390, 844), (320, 640), (1280, 900)]:
        page.set_viewport_size({"width": width, "height": height})
        expect(button).to_be_visible()
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
        feed = page.locator(".wechat-content").bounding_box()
        tabs = page.locator(".wechat-tabs").bounding_box()
        assert feed["y"] + feed["height"] <= tabs["y"] + 1
        page.screenshot(path=f"/tmp/valkophone-moment-post-{width}.png")

    # Missing Key creates neither a network request nor a new post.
    page.evaluate("localStorage.removeItem('deepseekApiKey')")
    page.reload(wait_until="networkidle")
    enter(page)
    count = len(requests)
    button.click()
    expect(page.get_by_role("heading", name="设置", exact=True)).to_be_visible()
    assert len(requests) == count and len(saved(page)) == 3

    # Hunter-authored posts and comments persist even before AI has replied.
    page.evaluate("localStorage.setItem('deepseekApiKey', 'TEST_ONLY_NOT_A_REAL_KEY')")
    page.reload(wait_until="networkidle")
    enter(page)
    page.get_by_placeholder("写点什么给朋友圈...").fill("猎人小姐的持久化测试：今天在窗边看书。")
    page.get_by_role("button", name="发布", exact=True).click()
    expect(page.locator(".moment-card").first).to_contain_text("今天在窗边看书。")
    expect(page.locator(".pending")).to_have_count(1)
    assert saved(page)[0]["author"] == "hunter"
    assert saved(page)[0]["replies"] == []
    page.wait_for_timeout(150)
    held.pop().abort()
    page.reload(wait_until="networkidle")
    enter(page)
    first = page.locator(".moment-card").first
    expect(first).to_contain_text("今天在窗边看书。")
    first.get_by_role("textbox").fill("补充：明天也想一起看书。")
    first.get_by_role("button", name="回复", exact=True).click()
    expect(first.locator(".pending")).to_have_count(1)
    assert saved(page)[0]["replies"][0]["text"] == "补充：明天也想一起看书。"
    assert len(saved(page)[0]["replies"]) == 1
    page.wait_for_timeout(150)
    sse(held.pop(), "那就把旁边的位置留给我。")
    expect(first).to_contain_text("那就把旁边的位置留给我。")
    page.reload(wait_until="networkidle")
    enter(page)
    expect(page.locator(".moment-card").first).to_contain_text("今天在窗边看书。")
    expect(page.locator(".moment-card").first).to_contain_text("补充：明天也想一起看书。")
    expect(page.locator(".moment-card").first).to_contain_text("那就把旁边的位置留给我。")
    assert len(saved(page)) == 4

    # Incomplete comments are discarded on restore, not kept spinning forever.
    pending = [{"id": "p", "author": "aoyin", "text": "敖尹正在回复...", "pending": True}]
    history[0]["replies"] += pending
    page.evaluate("([k,v]) => localStorage.setItem(k,v)", [KEY, json.dumps({"version": 1, "moments": history})])
    page.reload(wait_until="networkidle")
    assert len(saved(page)[0]["replies"]) == 1
    # Corrupted data recovers safely; explicitly empty history stays empty.
    page.evaluate("(k) => localStorage.setItem(k, 'broken')", KEY)
    page.reload(wait_until="networkidle")
    assert len(saved(page)) == 3
    page.evaluate("(k) => localStorage.setItem(k, '[]')", KEY)
    page.reload(wait_until="networkidle")
    assert saved(page) == []
    assert not errors, errors
    browser.close()
    print("PASS: confirmation/cancel, hunter post/comment persistence, context, retries, failures, responsive layouts")
