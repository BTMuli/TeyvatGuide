/**
 * 兑换中心分页筛选与详情异步顺序回归测试。
 * @since Beta v0.13.1
 */

import { readFileSync } from "node:fs";

import ts from "typescript";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as Vue from "vue";
import { compileScript, parse } from "vue/compiler-sfc";

import * as shopUtils from "../src/utils/community/shop.js";
import * as shopDisplay from "../src/utils/community/shopDisplay.js";

/**
 * 测试渲染器的节点与滚动尺寸。
 * @since Beta v0.13.1
 */
type HostNode = {
  parent: HostNode | null;
  children: Array<HostNode>;
  text: string;
  scrollHeight: number;
  clientHeight: number;
  scrollTop: number;
};

/**
 * 页面 setup 中被回归测试访问的状态与处理器。
 * @since Beta v0.13.1
 */
type ShopBindings = {
  goods: Vue.ShallowRef<Array<TGApp.BBS.Shop.Goods>>;
  visibleGoods: Vue.ComputedRef<Array<TGApp.BBS.Shop.Goods>>;
  page: Vue.Ref<number>;
  hasMore: Vue.Ref<boolean>;
  listError: Vue.Ref<string>;
  detailOpen: Vue.Ref<boolean>;
  detailLoading: Vue.Ref<boolean>;
  detail: Vue.ShallowRef<TGApp.BBS.Shop.Goods | undefined>;
  shopCatalog: Readonly<Vue.ShallowRef<HostNode | null>>;
  selectGoodsType: (type: "all" | "physical" | "virtual") => void;
  selectStock: (stock: "all" | "available" | "upcoming" | "sold-out") => void;
  selectCategory: (game: string) => void;
  retryGoods: () => void;
  maybeLoadMore: () => void;
  openDetail: (goods: TGApp.BBS.Shop.Goods) => Promise<void>;
};

/**
 * 编译后的页面脚本模块。
 * @since Beta v0.13.1
 */
type CompiledPage = {
  default: {
    setup: (props: Record<string, unknown>, context: Vue.SetupContext) => ShopBindings;
  };
};

const source = readFileSync(new URL("../src/pages/common/ComiShop.vue", import.meta.url), "utf8");
const script = compileScript(parse(source).descriptor, { id: "shop-catalog-regression" });
const compiled = ts.transpileModule(script.content, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const point = vi.fn();
const goods = vi.fn();
const detail = vi.fn();
const gameRoles = vi.fn();
const snackbarError = vi.fn();
const account = {
  uid: Vue.ref("398265412"),
  cookie: Vue.ref({ ltuid: "398265412", account_id: "398265412", ltoken: "test-token" }),
  briefInfo: Vue.ref({ nickname: "旅行者" }),
};
const dispose: Array<() => void> = [];

/**
 * 创建分页商品数据。
 * @since Beta v0.13.1
 */
function createGoods(overrides: Partial<TGApp.BBS.Shop.Goods> = {}): TGApp.BBS.Shop.Goods {
  return {
    goods_id: "goods-1",
    goods_name: "测试商品",
    icon: "",
    price: 100,
    point_sn: "myb",
    type: 2,
    game: "bbs",
    game_biz: "bbs",
    total: 10,
    next_num: 0,
    status: "online",
    account_cycle_type: "not_limit",
    account_cycle_limit: 0,
    account_exchange_num: 0,
    role_cycle_type: "not_limit",
    role_cycle_limit: 0,
    role_exchange_num: 0,
    ...overrides,
  };
}

/**
 * 创建保留滚动尺寸的轻量渲染节点。
 * @since Beta v0.13.1
 */
function createNode(): HostNode {
  return Vue.markRaw({
    parent: null,
    children: [],
    text: "",
    scrollHeight: 1000,
    clientHeight: 100,
    scrollTop: 0,
  });
}

/**
 * 挂载真实页面 setup，仅替换 IPC、网络、账号来源和无关子组件。
 * @since Beta v0.13.1
 * @returns 页面原始响应式状态与事件处理器；不验证浏览器布局
 */
function mountShop(): ShopBindings {
  const dependencies: Record<string, unknown> = {
    vue: Vue,
    pinia: { storeToRefs: (store: unknown) => store },
    "@comp/comiShop/cs-exchange-confirm.vue": {},
    "@comp/comiShop/cs-goods-detail-dialog.vue": {},
    "@comp/comiShop/cs-goods-item.vue": {},
    "@comp/func/snackbar.js": { error: snackbarError },
    "@req/shopReq.js": { point, goods, detail },
    "@req/takumiReq.js": { bind: { gameRoles } },
    "@store/app.js": () => ({ isLogin: Vue.ref(true) }),
    "@store/bbs.js": () => ({ gameList: Vue.ref([{ name: "原神" }]) }),
    "@store/user.js": () => account,
    "@utils/app/TGClient.js": {},
    "@utils/bbs/replyAccount.js": { matchesCurrentAccount: () => true },
    "@utils/community/shop.js": shopUtils,
    "@utils/community/shopDisplay.js": shopDisplay,
    "@utils/display/fmtUtil.js": { num: String },
    "@utils/display/TGUid.js": { maskUidTail: String },
    "@utils/network/TGHttps.js": { getErrMsg: (error: Error) => error.message },
  };
  const module = { exports: <CompiledPage>{} };
  new Function("require", "module", "exports", compiled)(
    (id: string) => {
      if (!(id in dependencies)) throw new Error(`未配置的页面依赖：${id}`);
      return dependencies[id];
    },
    module,
    module.exports,
  );
  let bindings: ShopBindings | undefined;
  const renderer = Vue.createRenderer<HostNode, HostNode>({
    createElement: createNode,
    createText: createNode,
    createComment: createNode,
    setText: (node, text) => (node.text = text),
    setElementText: (node, text) => (node.text = text),
    parentNode: (node) => node.parent,
    nextSibling: () => null,
    patchProp: () => undefined,
    insert: (node, parent) => {
      node.parent = parent;
      parent.children.push(node);
    },
    remove: (node) => {
      if (node.parent)
        node.parent.children = node.parent.children.filter((child) => child !== node);
    },
  });
  const app = renderer.createApp({
    setup(props, context) {
      bindings = module.exports.default.setup(props, context);
      return () => Vue.h("section", { ref: "shopCatalog" });
    },
  });
  app.mount(createNode());
  dispose.push(() => app.unmount());
  if (!bindings) throw new Error("页面未完成初始化");
  return bindings;
}

/**
 * 等待网络 Promise 与 Vue 更新队列。
 * @since Beta v0.13.1
 */
async function settle(): Promise<void> {
  for (let index = 0; index < 8; index += 1) await Vue.nextTick();
}

/**
 * 创建可控制完成顺序的请求。
 * @since Beta v0.13.1
 */
function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((callback) => (resolve = callback));
  return { promise, resolve };
}

/**
 * 创建商品列表响应。
 * @since Beta v0.13.1
 */
function listResponse(
  list: Array<TGApp.BBS.Shop.Goods>,
  total: number,
): TGApp.BBS.Shop.GoodsListResp {
  return { retcode: 0, message: "OK", data: { list, total } };
}

beforeEach(() => {
  vi.resetAllMocks();
  account.uid.value = "398265412";
  account.cookie.value = { ltuid: "398265412", account_id: "398265412", ltoken: "test-token" };
  point.mockResolvedValue({ retcode: 0, message: "OK", data: { points: 1000 } });
  goods.mockResolvedValue(listResponse([createGoods()], 1));
});

afterEach(() => {
  for (const unmount of dispose.splice(0)) unmount();
});

describe("shop catalog pagination and filters", () => {
  it("scans empty filtered pages until a matching product is found", async () => {
    goods
      .mockResolvedValueOnce(listResponse([createGoods()], 60))
      .mockResolvedValueOnce(listResponse([createGoods({ goods_id: "g2" })], 60))
      .mockResolvedValueOnce(listResponse([createGoods({ goods_id: "g3", type: 1 })], 60));
    const page = mountShop();
    await settle();
    page.selectGoodsType("physical");
    await settle();

    expect(goods.mock.calls.map((call) => call[2])).toEqual([1, 2, 3]);
    expect(page.visibleGoods.value.map((item) => item.goods_id)).toEqual(["g3"]);
    expect(page.hasMore.value).toBe(false);
  });

  it("stops automatic requests on errors and retries the failed append page", async () => {
    goods
      .mockResolvedValueOnce(listResponse([createGoods()], 40))
      .mockRejectedValueOnce(new Error("网络失败"))
      .mockResolvedValueOnce(listResponse([createGoods({ goods_id: "g2" })], 40));
    const page = mountShop();
    await settle();
    const catalog = page.shopCatalog.value;
    if (!catalog) throw new Error("滚动容器未绑定");
    catalog.scrollTop = 950;
    page.maybeLoadMore();
    await settle();
    page.maybeLoadMore();
    await settle();

    expect(goods).toHaveBeenCalledTimes(2);
    expect(page.goods.value).toHaveLength(1);
    expect(page.listError.value).toBe("网络失败");
    page.retryGoods();
    await settle();
    expect(goods.mock.calls.map((call) => call[2])).toEqual([1, 2, 2]);
    expect(page.goods.value.map((item) => item.goods_id)).toEqual(["goods-1", "g2"]);
    page.maybeLoadMore();
    await settle();
    expect(goods).toHaveBeenCalledTimes(3);
  });

  it("stops on an empty response and removes repeated product IDs", async () => {
    const item = createGoods();
    goods
      .mockResolvedValueOnce(listResponse([item, item], 40))
      .mockResolvedValueOnce(listResponse([], 40));
    const page = mountShop();
    await settle();
    expect(page.goods.value).toHaveLength(1);
    page.selectGoodsType("physical");
    await settle();
    expect(page.hasMore.value).toBe(false);
    page.maybeLoadMore();
    await settle();
    expect(goods).toHaveBeenCalledTimes(2);
  });

  it("keeps upcoming goods out of sold-out results and zero stock out of in-stock results", async () => {
    goods.mockResolvedValueOnce(
      listResponse(
        [
          createGoods({ goods_id: "upcoming", total: 0, status: "not_in_sell" }),
          createGoods({ goods_id: "sold-out", total: 0 }),
          createGoods({
            goods_id: "limit",
            total: 0,
            account_cycle_type: "forever",
            account_cycle_limit: 1,
            account_exchange_num: 1,
          }),
          createGoods({ goods_id: "unlimited", total: 0, unlimit: true }),
        ],
        4,
      ),
    );
    const page = mountShop();
    await settle();
    page.selectStock("sold-out");
    expect(page.visibleGoods.value.map((item) => item.goods_id)).toEqual(["sold-out"]);
    page.selectStock("upcoming");
    expect(page.visibleGoods.value.map((item) => item.goods_id)).toEqual(["upcoming"]);
    page.selectStock("available");
    expect(page.visibleGoods.value.map((item) => item.goods_id)).toEqual(["unlimited"]);
  });

  it("ignores list responses from an earlier game category", async () => {
    const old = deferred<TGApp.BBS.Shop.GoodsListResp>();
    goods
      .mockReturnValueOnce(old.promise)
      .mockResolvedValueOnce(listResponse([createGoods({ goods_id: "new" })], 1));
    const page = mountShop();
    page.selectCategory("hk4e");
    await settle();
    old.resolve(listResponse([createGoods({ goods_id: "old" })], 1));
    await settle();
    expect(page.goods.value.map((item) => item.goods_id)).toEqual(["new"]);
  });
});

describe("shop detail request ordering", () => {
  it("waits for detail and roles before opening the overlay and suppresses duplicate clicks", async () => {
    const detailRequest = deferred<TGApp.BBS.Shop.GoodsDetailResp>();
    const rolesRequest =
      deferred<TGApp.BBS.Response.BaseWithData<{ list: Array<TGApp.BBS.Shop.Role> }>>();
    detail.mockReturnValueOnce(detailRequest.promise);
    gameRoles.mockReturnValueOnce(rolesRequest.promise);
    const page = mountShop();
    await settle();
    const item = createGoods({ game: "hk4e", game_biz: "hk4e_cn" });
    const opening = page.openDetail(item);
    await page.openDetail(item);
    expect(detail).toHaveBeenCalledTimes(1);
    expect(page.detailOpen.value).toBe(false);
    detailRequest.resolve({ retcode: 0, message: "OK", data: item });
    await settle();
    expect(gameRoles).toHaveBeenCalledTimes(1);
    expect(page.detailOpen.value).toBe(false);
    rolesRequest.resolve({ retcode: 0, message: "OK", data: { list: [] } });
    await opening;
    expect(page.detailOpen.value).toBe(true);
    expect(page.detailLoading.value).toBe(false);
  });

  it("opens only the latest clicked product", async () => {
    const old = deferred<TGApp.BBS.Shop.GoodsDetailResp>();
    const current = createGoods({ goods_id: "current" });
    detail
      .mockReturnValueOnce(old.promise)
      .mockResolvedValueOnce({ retcode: 0, message: "OK", data: current });
    const page = mountShop();
    const previous = page.openDetail(createGoods());
    await page.openDetail(current);
    old.resolve({ retcode: 0, message: "OK", data: createGoods() });
    await previous;
    expect(page.detail.value?.goods_id).toBe("current");
    expect(page.detailOpen.value).toBe(true);
  });

  it("keeps the overlay closed on errors and after logout invalidates pending detail", async () => {
    detail.mockRejectedValueOnce(new Error("详情失败"));
    const page = mountShop();
    await page.openDetail(createGoods());
    expect(page.detailOpen.value).toBe(false);
    expect(snackbarError).toHaveBeenCalledWith("详情失败");
    const pending = deferred<TGApp.BBS.Shop.GoodsDetailResp>();
    detail.mockReturnValueOnce(pending.promise);
    const opening = page.openDetail(createGoods());
    account.uid.value = "";
    pending.resolve({ retcode: 0, message: "OK", data: createGoods() });
    await opening;
    expect(page.detailOpen.value).toBe(false);
    expect(page.detail.value).toBeUndefined();
  });
});
