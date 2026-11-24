/**
 * 高难挑战记录的安全文本渲染回归测试
 * @since Beta v0.14.1
 */

import { describe, expect, it } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";

import { parseSafeChallengeText } from "../src/utils/sync/safeChallengeText.js";

describe("parseSafeChallengeText", () => {
  it("preserves six- and eight-digit colors, nested colors and surrounding text", () => {
    expect(
      parseSafeChallengeText("开始<color=#a1B2c3>火<color=#FF008080>水</color>火</color>结束"),
    ).toEqual([
      { text: "开始", color: undefined },
      { text: "火", color: "#a1B2c3" },
      { text: "水", color: "#FF008080" },
      { text: "火", color: "#a1B2c3" },
      { text: "结束", color: undefined },
    ]);
    expect(parseSafeChallengeText("")).toEqual([]);
  });

  it("preserves real and escaped line breaks including br without accepting its attributes", () => {
    expect(parseSafeChallengeText("一\n二\r\n三\\n四\\r\\n五<br>六<BR />七")).toEqual([
      { text: "一\n二\n三\n四\n五\n六\n七", color: undefined },
    ]);
    expect(parseSafeChallengeText('<br onmouseover="alert(1)">继续')).toEqual([
      { text: '<br onmouseover="alert(1)">继续', color: undefined },
    ]);
  });

  it("keeps invalid color markers, attributes, CSS and unmatched closing tags as text", () => {
    const input =
      '<color=#123456" style="background:url(https://evil.test/a)">内容</color>' +
      "<color=#xyzxyz>文字</color></color>";
    expect(parseSafeChallengeText(input)).toEqual([{ text: input, color: undefined }]);
  });

  it("keeps untrusted nested HTML, links and entity-encoded markup inert", async () => {
    const input =
      '<color=#ff0000>前<img src="https://evil.test/a" onerror="alert(1)">' +
      '<a href="javascript:alert(2)">链接</a><script>alert(3)</script>' +
      "&lt;svg onload=alert(4)&gt;后</color>";
    const parts = parseSafeChallengeText(input);
    expect(parts).toEqual([
      {
        color: "#ff0000",
        text:
          '前<img src="https://evil.test/a" onerror="alert(1)">' +
          '<a href="javascript:alert(2)">链接</a><script>alert(3)</script>' +
          "&lt;svg onload=alert(4)&gt;后",
      },
    ]);
    const app = createSSRApp({
      render: () =>
        h(
          "div",
          parts.map((part) => h("span", { style: { color: part.color } }, part.text)),
        ),
    });
    const html = await renderToString(app);
    expect(html).toContain("&lt;img");
    expect(html).toContain("&lt;script&gt;alert(3)&lt;/script&gt;");
    expect(html).toContain("&amp;lt;svg");
    expect(html).not.toMatch(/<(?:img|a|script|svg)\b/i);
    expect(html).not.toContain('href="');
    expect(html).not.toContain('src="');
  });

  it("does not interpret game links or malformed tags as markup", () => {
    const input = "{LINK#N123}词条{/LINK} <color=#abcdef;display:none>保留</color>";
    const parts = parseSafeChallengeText(input);
    expect(parts.map((part) => part.text).join("")).toBe(input);
    expect(parts.every((part) => part.color === undefined)).toBe(true);
  });
});
