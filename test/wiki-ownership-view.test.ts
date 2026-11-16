/**
 * 角色与武器图鉴的持有显示、侧栏计数和列表置暗渲染回归测试。
 * @since Beta v0.13.1
 */

import { describe, expect, it, vi } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";

const state = vi.hoisted(() => ({ enabled: false, ownedId: 0 }));

vi.mock("@hooks/useWikiOwnership.js", async () => {
  const { ref, shallowRef } = await import("vue");
  return {
    useWikiOwnership: () => ({
      showOwnership: ref(state.enabled),
      ownedIds: shallowRef(new Set([state.ownedId])),
      ready: ref(true),
      loading: ref(false),
    }),
  };
});
vi.mock("@store/user.js", () => ({
  default: () => ({ account: { gameUid: "100000001" } }),
}));
vi.mock("vue-router", () => ({
  useRoute: () => ({ params: { id: "0" } }),
  useRouter: () => ({ replace: vi.fn() }),
}));
vi.mock("@comp/func/dialog.js", () => ({ default: {} }));
vi.mock("@comp/func/snackbar.js", () => ({ default: { warn: vi.fn() } }));
vi.mock("@utils/app/TGWindow.js", () => ({ toObcPage: vi.fn() }));
vi.mock("@comp/pageWiki/twc-character.vue", () => ({
  default: { setup: () => () => null },
}));
vi.mock("@comp/pageWiki/twc-weapon.vue", () => ({
  default: { setup: () => () => null },
}));
vi.mock("@comp/pageWiki/two-select-c.vue", () => ({
  default: { setup: () => () => null },
}));
vi.mock("@comp/pageWiki/two-select-w.vue", () => ({
  default: { setup: () => () => null },
}));

import TwgCatalog from "../src/components/pageWiki/twg-catalog.vue";
import { AppCharacterData, AppWeaponData } from "../src/data/index.js";
import Character from "../src/pages/WIKI/Character.vue";
import Weapon from "../src/pages/WIKI/Weapon.vue";

it("共用图鉴布局未开启持有功能时不显示勾选项", async () => {
  const app = createSSRApp({
    render: () =>
      h(TwgCatalog, { count: 0, icon: "", search: "", title: "圣遗物图鉴", unit: "套圣遗物" }),
  });
  const control = { setup: () => () => null };
  app.component("VIcon", control);
  app.component("VBtn", control);
  app.component("VTextField", control);
  const html = await renderToString(app);
  expect(html).toContain("圣遗物图鉴");
  expect(html).not.toContain('type="checkbox"');
});

describe.each([
  { name: "角色", component: Character, data: AppCharacterData, unit: "位角色" },
  { name: "武器", component: Weapon, data: AppWeaponData, unit: "件武器" },
])("$name图鉴持有显示", ({ component, data, unit }) => {
  it.each([false, true])("勾选状态 %s 保留全部列表及计数，仅置暗未拥有项", async (enabled) => {
    state.enabled = enabled;
    state.ownedId = data[0].id;
    const app = createSSRApp({ render: () => h(component) });
    const control = { setup: () => () => null };
    app.component("VIcon", control);
    app.component("VBtn", control);
    app.component("VTextField", control);
    const html = await renderToString(app);
    const header = html.match(/<header\b[\s\S]*?<\/header>/)?.[0] ?? "";
    expect(header).toContain(`${data.length} ${unit}`);
    expect(header).toContain('type="checkbox"');
    expect(header).toContain("已拥有");
    expect(/\bchecked\b/.test(header)).toBe(enabled);

    const rows = [...html.matchAll(/class="([^"]*\btwc-li-box\b[^"]*)"/g)];
    expect(rows).toHaveLength(data.length);
    expect(rows.filter((row) => row[1].includes("is-unowned"))).toHaveLength(
      enabled ? data.length - 1 : 0,
    );
    expect(html.match(/tabindex="0"/g)).toHaveLength(data.length);
    expect(html).not.toContain('aria-disabled="true"');
  });
});
