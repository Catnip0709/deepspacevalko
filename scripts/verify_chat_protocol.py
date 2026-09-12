"""Intercepted strict-tool integration checks; no real keys or paid requests."""
import json
import os
from playwright.sync_api import sync_playwright, expect

URL = os.environ.get("BASE_URL", "http://localhost:5173")


def tool_response(arguments, finish_reason="tool_calls"):
    return json.dumps(
        {
            "choices": [
                {
                    "finish_reason": finish_reason,
                    "message": {
                        "content": None,
                        "tool_calls": [
                            {
                                "id": "call_test",
                                "type": "function",
                                "function": {
                                    "name": "deliver_wechat_response",
                                    "arguments": json.dumps(arguments, ensure_ascii=False),
                                },
                            }
                        ],
                    },
                }
            ]
        },
        ensure_ascii=False,
    )


def reply(text="我在，慢慢说。", action=None):
    return {"reply": text, "action": action or {"type": "none"}}


with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    requests, queue, errors = [], [], []
    page.on("pageerror", lambda error: errors.append(str(error)))

    def respond(route):
        requests.append(
            {
                "url": route.request.url,
                "body": route.request.post_data_json,
            }
        )
        assert queue, "Unexpected request"
        item = queue.pop(0)
        route.fulfill(
            status=item.get("status", 200),
            content_type="application/json",
            body=item["body"],
        )

    page.route("https://api.deepseek.com/**", respond)
    page.goto(URL, wait_until="networkidle")
    page.evaluate(
        """() => {
          localStorage.setItem('deepseekApiKey', 'TEST_ONLY');
          localStorage.setItem('valkophoneUnlocked:v1', 'true');
          localStorage.setItem('chatMessages:aoyin', JSON.stringify([
            ...Array.from({length: 20}, (_, i) => ({
              id: `old-${i}`,
              role: i % 2 ? 'assistant' : 'user',
              content: `旧消息${i}`,
              createdAt: '12:00'
            })),
            {
              id:'loc',
              role:'assistant',
              type:'location',
              location:{place:'东门',note:'等你'},
              content:'过来吧。',
              createdAt:'12:00'
            },
            {
              id:'red',
              role:'assistant',
              type:'redPacket',
              redPacket:{amount:'52.00',note:'奶茶'},
              content:'给你。',
              createdAt:'12:00'
            }
          ]));
        }"""
    )
    page.reload(wait_until="networkidle")
    page.get_by_role("button", name="打开微信", exact=True).click()
    field = page.get_by_placeholder("和敖尹说点什么...")

    def send(text, responses):
        start = len(requests)
        queue.extend(responses)
        field.fill(text)
        page.get_by_role("button", name="发送消息", exact=True).click()
        expect(field).to_be_enabled()
        assert not queue
        return requests[start:]

    batch = send("你好", [{"body": tool_response(reply())}])
    assert len(batch) == 1
    request = batch[0]
    assert request["url"] == "https://api.deepseek.com/beta/chat/completions"
    body = request["body"]
    assert body["stream"] is False
    assert body["thinking"] == {"type": "disabled"}
    assert body["tool_choice"]["function"]["name"] == "deliver_wechat_response"
    assert body["tools"][0]["function"]["strict"] is True
    action_schema = body["tools"][0]["function"]["parameters"]["properties"]["action"]
    assert len(action_schema["anyOf"]) == 3
    assert "已发送定位：东门" in body["messages"][-3]["content"]
    assert "已发送红包：52.00元" in body["messages"][-2]["content"]
    expect(page.locator(".message-row.other").last).to_contain_text("我在，慢慢说。")

    red_packet = {
        "type": "red_packet",
        "amount": "52.00",
        "note": "买奶茶",
    }
    batch = send("给我发红包", [{"body": tool_response(reply("", red_packet))}])
    red_schema = batch[0]["body"]["tools"][0]["function"]["parameters"]["properties"]["action"]
    assert red_schema["properties"]["type"]["enum"] == ["red_packet"]
    expect(page.locator(".message-row.other").last.locator(".chat-red-packet-card")).to_contain_text("52.00 元")

    empty_response = json.dumps({"choices": [{"finish_reason": "stop", "message": {"content": "bad"}}]})
    location = {"type": "location", "place": "猎人协会东门", "note": ""}
    batch = send(
        "给我发定位",
        [{"body": empty_response}, {"body": tool_response(reply("", location))}],
    )
    assert len(batch) == 2
    location_schema = batch[1]["body"]["tools"][0]["function"]["parameters"]["properties"]["action"]
    assert location_schema["properties"]["type"]["enum"] == ["location"]
    assert "重新调用 deliver_wechat_response" in batch[1]["body"]["messages"][-1]["content"]
    expect(page.locator(".message-row.other").last.locator(".chat-location-card")).to_be_visible()

    batch = send(
        "在吗",
        [{"body": tool_response(reply(""))}, {"body": tool_response(reply(""))}],
    )
    assert len(batch) == 2
    expect(page.locator(".chat-error")).to_contain_text("没有发来内容")

    batch = send("401测试", [{"status": 401, "body": "SECRET"}])
    assert len(batch) == 1
    expect(page.locator(".chat-error")).to_contain_text("Key 无效")

    assert not errors, errors
    browser.close()
    print("PASS: strict tool schema, full history, text/card replies, retries and errors")
