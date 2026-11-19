/**
 * 结构化文本链接样式回归测试。
 * @since Beta v0.13.2
 */
import { describe, expect, it, vi } from "vitest";
import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";

import TpText from "../src/components/viewPost/tp-text.vue";

vi.mock("@comp/func/snackbar.js", () => ({ default: {} }));
vi.mock("@req/bbsReq.js", () => ({ default: {} }));
vi.mock("@utils/app/linkParser.js", () => ({ parseLink: vi.fn(), parsePost: vi.fn() }));

describe("结构化文本链接样式", () => {
  it.each([undefined, "", "  "])("链接地址为 %j 时渲染普通文本", async (link) => {
    const app = createSSRApp(TpText, {
      data: { insert: "祈愿时间", attributes: { bold: true, link } },
    });

    const markup = await renderToString(app);

    expect(markup).toContain("祈愿时间");
    expect(markup).not.toContain("tp-text-link");
  });

  it("有链接地址时保留链接样式和目标提示", async () => {
    const link = "https://example.com/announcement";
    const app = createSSRApp(TpText, { data: { insert: "活动详情", attributes: { link } } });

    const markup = await renderToString(app);

    expect(markup).toContain('class="tp-text-link"');
    expect(markup).toContain(`title="${link}"`);
  });
});
