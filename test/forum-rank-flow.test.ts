/**
 * 榜单切换时瀑布流首屏渲染回归测试。
 * @since Beta v0.13.2
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";

import { afterEach, describe, expect, it, vi } from "vitest";
import * as Vue from "vue";
import { compileScript, compileTemplate, parse } from "vue/compiler-sfc";

const mocks = vi.hoisted(() => ({
  imageForums: vi.fn(),
  imagePosts: vi.fn(),
  refreshForumList: vi.fn(),
}));
vi.mock("@req/forumRankReq.js", () => ({ default: mocks }));
vi.mock("vue-router", () => ({
  useRoute: () => ({ params: { gid: "2", forum: "29" } }),
  useRouter: vi.fn(),
}));
vi.mock("@store/app.js", () => ({ default: () => ({}) }));
vi.mock("@store/bbs.js", () => ({
  default: () => ({
    gameList: Vue.ref([
      { id: 2, name: "原神" },
      { id: 3, name: "崩坏3" },
    ]),
    forumList: Vue.ref([]),
    refreshForumList: mocks.refreshForumList,
  }),
}));
vi.mock("@utils/network/TGHttps.js", () => ({ default: { getErrMsg: String } }));
vi.mock("@utils/system/TGLogger.js", () => ({ default: { Warn: vi.fn() } }));
vi.mock("@comp/app/t-gameNav.vue", () => ({ default: { render: () => null } }));
vi.mock("@comp/app/t-state-panel.vue", () => ({ default: { render: () => null } }));
vi.mock("@comp/viewPost/vp-overlay-image.vue", () => ({ default: { render: () => null } }));
vi.mock("@comp/viewPost/vp-overlay-user.vue", () => ({ default: { render: () => null } }));
vi.mock("@comp/viewPost/vp-rank-post-card.vue", () => ({
  default: {
    props: ["post"],
    setup:
      ({ post }: { post: TGApp.BBS.Forum.ImageRankPost }) =>
      () =>
        Vue.h("article", { "data-post-id": post.post.post_id }),
  },
}));

import VpRankPostFlow from "../src/components/viewPost/vp-rank-post-flow.vue";
import PostForumRank from "../src/pages/common/PostForumRank.vue";

const { createRenderer, h, nextTick, ssrContextKey } = Vue;

/**
 * 给内存渲染器编译真实页面的客户端模板。Vitest 在 Node 中默认编译 SSR 模板。
 * @since Beta v0.13.2
 */
function compileClientRender(path: string): Vue.RenderFunction {
  const filename = fileURLToPath(new URL(path, import.meta.url));
  const { descriptor } = parse(readFileSync(filename, "utf8"), { filename });
  const { code } = compileTemplate({
    id: filename,
    filename,
    source: descriptor.template?.content ?? "",
    compilerOptions: {
      mode: "function",
      bindingMetadata: compileScript(descriptor, { id: filename }).bindings,
    },
  });
  return runInNewContext("(function(Vue) {" + code + "})(Vue)", { Vue });
}

VpRankPostFlow.render = compileClientRender("../src/components/viewPost/vp-rank-post-flow.vue");
PostForumRank.render = compileClientRender("../src/pages/common/PostForumRank.vue");

/** 瀑布流组件测试中的渲染节点。 @since Beta v0.13.2 */
type HostNode = {
  tag: string;
  parent: HostNode | null;
  children: Array<HostNode>;
  props: Map<string, unknown>;
  clientWidth: number;
  getBoundingClientRect: () => { top: number; bottom: number };
  hasAttribute: (key: string) => boolean;
  setAttribute: (key: string, value: string) => void;
  querySelectorAll: (selector: string) => Array<HostNode>;
  animate: (
    frames: Array<Keyframe>,
    options: { duration: number; delay: number },
  ) => {
    finished: Promise<void>;
  };
};

/** 测试视口回调需要的可见尺寸。 @since Beta v0.13.2 */
type HostIntersection = Pick<IntersectionObserverEntry, "isIntersecting" | "intersectionRatio"> & {
  target: HostNode;
  boundingClientRect: { height: number };
  intersectionRect: { height: number };
  rootBounds: { height: number };
};

/** 创建一页带有指定帖子 ID 的榜单响应。 @since Beta v0.13.2 */
function rankedPosts(...ids: Array<string>): TGApp.BBS.Forum.ImageRankPostsResp {
  return {
    retcode: 0,
    message: "OK",
    data: {
      list: ids.map((id) => ({
        post: { post_id: id, subject: "", cover: "", images: [], created_at: 1, updated_at: 0 },
        cover: null,
        image_list: [],
        user: null,
        stat: null,
      })),
      is_last: true,
      last_id: "0",
    },
  };
}

afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllGlobals();
});

describe("forum ranking flow", () => {
  it.each([true, false])(
    "renders the new period without a scroll event, response before leave ends: %s",
    async (replyFirst) => {
      const animations = new Set<() => void>();
      const exitTimings: Array<{ delay: number; duration: number }> = [];
      const intersectionChecks = new Set<() => void>();
      let scrollTop = 0;
      vi.stubGlobal("window", {
        innerHeight: 600,
        getComputedStyle: () => ({ getPropertyValue: () => "100px" }),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        scrollTo: (position: ScrollToOptions) => {
          scrollTop = position.top ?? 0;
        },
        matchMedia: () => ({ matches: false }),
      });
      vi.stubGlobal(
        "ResizeObserver",
        class {
          observe(): void {}
          unobserve(): void {}
          disconnect(): void {}
        },
      );
      vi.stubGlobal("Element", Object);
      vi.stubGlobal(
        "IntersectionObserver",
        class {
          private readonly targets = new Map<HostNode, HostIntersection | undefined>();
          private readonly thresholds: Array<number>;

          constructor(
            private readonly notify: (entries: Array<HostIntersection>) => void,
            options?: IntersectionObserverInit,
          ) {
            const threshold = options?.threshold ?? 0;
            this.thresholds = Array.isArray(threshold) ? threshold : [threshold];
            intersectionChecks.add(this.check);
          }

          private readonly check = (): void => {
            this.notify(
              [...this.targets].flatMap(([target, previous]) => {
                const style = target.props.get("style");
                const top =
                  (target.parent?.getBoundingClientRect().top ?? 0) +
                  (style && typeof style === "object" && "top" in style
                    ? Number.parseFloat(String(style.top))
                    : 0);
                const visibleHeight = Math.max(0, Math.min(top + 365, 600) - Math.max(top, 100));
                const intersectionRatio =
                  target.props.get("class") === "post-rank-more"
                    ? Number(scrollTop >= 1000)
                    : visibleHeight / 365;
                const entry: HostIntersection = {
                  target,
                  isIntersecting: intersectionRatio > 0,
                  intersectionRatio,
                  boundingClientRect: { height: 365 },
                  intersectionRect: { height: visibleHeight },
                  rootBounds: { height: 500 },
                };
                this.targets.set(target, entry);
                const crossedThreshold = this.thresholds.some(
                  (threshold) =>
                    previous &&
                    previous.intersectionRatio >= threshold !== intersectionRatio >= threshold,
                );
                return !previous ||
                  previous.isIntersecting !== entry.isIntersecting ||
                  crossedThreshold
                  ? [entry]
                  : [];
              }),
            );
          };

          observe(target: HostNode): void {
            this.targets.set(target, undefined);
            if (this.targets.size === 1) queueMicrotask(this.check);
          }

          unobserve(target: HostNode): void {
            this.targets.delete(target);
          }

          disconnect(): void {
            intersectionChecks.delete(this.check);
            this.targets.clear();
          }
        },
      );
      const week = Promise.withResolvers<TGApp.BBS.Forum.ImageRankPostsResp>();
      const otherCatalog = Promise.withResolvers<TGApp.BBS.Forum.ImageRankForumsResp>();
      const forumMetadata = Promise.withResolvers<void>();
      mocks.refreshForumList.mockReturnValue(forumMetadata.promise);
      mocks.imageForums.mockImplementation((gid: number) =>
        gid === 2
          ? Promise.resolve({
              retcode: 0,
              message: "OK",
              data: {
                list: [{ forum_id: 29, post_image_list_name: "同人图", typeList: [1, 2, 3] }],
              },
            })
          : otherCatalog.promise,
      );
      const monthly = rankedPosts("monthly", "2", "3", "4", "5", "6");
      mocks.imagePosts
        .mockResolvedValueOnce(rankedPosts("daily"))
        .mockReturnValueOnce(week.promise)
        .mockResolvedValueOnce({
          ...monthly,
          data: { ...monthly.data, is_last: false, last_id: "2" },
        })
        .mockResolvedValueOnce(rankedPosts("7", "8"));

      const createNode = (tag: string): HostNode => {
        const props = new Map<string, unknown>();
        const node: HostNode = {
          tag,
          parent: null,
          children: [],
          props,
          clientWidth: 600,
          getBoundingClientRect: () => ({
            top: node.parent?.children.some(
              (item) => item !== node && item.hasAttribute("data-rank-flow-leaving"),
            )
              ? 2400
              : 100 - scrollTop,
            bottom: 340,
          }),
          hasAttribute: (key) => props.has(key),
          setAttribute: (key, value) => {
            props.set(key, value);
          },
          querySelectorAll: (selector) =>
            node.children.filter((item) =>
              String(item.props.get("class")).split(" ").includes(selector.slice(1)),
            ),
          animate: (_, { duration, delay }) => {
            const { promise, resolve } = Promise.withResolvers<void>();
            animations.add(resolve);
            exitTimings.push({ duration, delay });
            return { finished: promise };
          },
        };
        return node;
      };
      const removeNode = (node: HostNode): void => {
        const parent = node.parent;
        if (!parent) return;
        parent.children.splice(parent.children.indexOf(node), 1);
        node.parent = null;
      };
      const renderer = createRenderer<HostNode, HostNode>({
        createElement: createNode,
        createText: () => createNode("#text"),
        createComment: () => createNode("#comment"),
        insert(node, parent, anchor) {
          removeNode(node);
          const index = anchor ? parent.children.indexOf(anchor) : parent.children.length;
          parent.children.splice(index, 0, node);
          node.parent = parent;
        },
        remove: removeNode,
        parentNode: (node) => node.parent,
        nextSibling: (node) =>
          node.parent?.children[node.parent.children.indexOf(node) + 1] ?? null,
        querySelector: () => createNode("body"),
        patchProp(node, key, _oldValue, value) {
          if (value === null) node.props.delete(key);
          else node.props.set(key, value);
        },
        setText() {},
        setElementText() {},
      });
      const root = createNode("root");
      const app = renderer.createApp(PostForumRank);
      app.provide(ssrContextKey, {});
      app.component(
        "v-app-bar",
        Vue.defineComponent({
          setup:
            (_, { slots }) =>
            () =>
              h("header", [slots.prepend?.(), slots.default?.(), slots.extension?.()]),
        }),
      );
      app.component("v-btn", { render: () => null });
      app.component("v-icon", { render: () => null });
      app.component(
        "v-btn-toggle",
        Vue.defineComponent({
          inheritAttrs: false,
          emits: ["update:modelValue"],
          setup:
            (_, { attrs, emit }) =>
            () =>
              h("rank-toggle", {
                "aria-label": attrs["aria-label"],
                onSelect: (value: number) => emit("update:modelValue", value),
              }),
        }),
      );
      const descendants = (node: HostNode): Array<HostNode> => [
        node,
        ...node.children.flatMap(descendants),
      ];
      const articleIds = (): Array<unknown> =>
        descendants(root)
          .filter((node) => node.tag === "article")
          .map((node) => node.props.get("data-post-id"));
      const getCell = (id: string): HostNode | null | undefined =>
        descendants(root).find((node) => node.props.get("data-post-id") === id)?.parent?.parent;
      const selectPeriod = (period: number): void => {
        const select = descendants(root)
          .find((node) => node.props.get("aria-label") === "榜单类型")
          ?.props.get("onSelect");
        if (typeof select !== "function") throw new Error("榜单类型按钮未挂载");
        select(period);
      };

      app.mount(root);
      try {
        await vi.waitFor(() => expect(articleIds()).toEqual(["daily"]));
        expect(mocks.imageForums).toHaveBeenCalledOnce();
        forumMetadata.resolve();
        await vi.waitFor(() => expect(mocks.imageForums).toHaveBeenCalledTimes(2));
        selectPeriod(2);
        await vi.waitFor(() => expect(animations.size).toBeGreaterThan(0));
        if (replyFirst) {
          week.resolve(rankedPosts("weekly-first", "weekly-second"));
          await week.promise;
          await nextTick();
          expect(descendants(root).filter((node) => node.tag === "ol")).toHaveLength(1);
        }
        animations.forEach((finish) => finish());
        animations.clear();
        if (!replyFirst) {
          await vi.waitFor(() => expect(articleIds()).toEqual([]));
          week.resolve(rankedPosts("weekly-first", "weekly-second"));
        }
        await vi.waitFor(() => expect(articleIds()).toEqual(["weekly-first", "weekly-second"]));
        exitTimings.length = 0;
        selectPeriod(3);
        await vi.waitFor(() => expect(animations.size).toBeGreaterThan(0));
        expect(exitTimings).toHaveLength(2);
        expect(exitTimings[1].delay).toBeCloseTo(exitTimings[0].duration / 2);
        expect(exitTimings[1].delay + exitTimings[1].duration).toBeCloseTo(800);
        animations.forEach((finish) => finish());
        await vi.waitFor(() => expect(articleIds()).toEqual(["monthly", "2", "3", "4", "5", "6"]));
        const lastCell = getCell("5");
        const firstCell = getCell("monthly");
        expect(lastCell).toBeDefined();
        expect(lastCell?.props.get("class")).not.toContain("rank-flow-cell-visible");
        expect(firstCell?.props.get("class")).toContain("rank-flow-cell-visible");

        scrollTop = 255;
        intersectionChecks.forEach((check) => check());
        await nextTick();
        expect(firstCell?.props.get("class")).toContain("rank-flow-cell-visible");

        scrollTop = 300;
        intersectionChecks.forEach((check) => check());
        await nextTick();
        expect(firstCell?.props.get("class")).not.toContain("rank-flow-cell-visible");
        expect(lastCell?.props.get("class")).not.toContain("rank-flow-cell-visible");

        scrollTop = 360;
        intersectionChecks.forEach((check) => check());
        await nextTick();

        expect(getCell("5")).toBe(lastCell);
        expect(lastCell?.props.get("class")).toContain("rank-flow-cell-visible");
        expect(getCell("monthly")).toBe(firstCell);
        expect(firstCell?.props.get("class")).not.toContain("rank-flow-cell-visible");
        expect(mocks.imagePosts).toHaveBeenCalledTimes(3);

        scrollTop = 1000;
        intersectionChecks.forEach((check) => check());
        await vi.waitFor(() =>
          expect(articleIds()).toEqual([
            ...monthly.data.list.map(({ post }) => post.post_id),
            "7",
            "8",
          ]),
        );
        intersectionChecks.forEach((check) => check());
        await nextTick();
        const firstNewCard = getCell("7");
        const secondNewCard = getCell("8");
        expect(firstNewCard?.props.get("class")).toContain("rank-flow-cell-visible");
        expect(secondNewCard?.props.get("class")).toContain("rank-flow-cell-visible");
        expect(firstNewCard?.props.get("style")).toMatchObject({
          "--rank-flow-entry-delay": "0ms",
          "--rank-flow-entry-duration": `${(520 / 3) * 2}ms`,
        });
        expect(secondNewCard?.props.get("style")).toMatchObject({
          "--rank-flow-entry-delay": `${520 / 3}ms`,
        });
        expect(mocks.imagePosts).toHaveBeenCalledTimes(4);
        expect(mocks.imagePosts).toHaveBeenLastCalledWith(29, 3, "2", expect.any(AbortSignal));
      } finally {
        app.unmount();
        forumMetadata.resolve();
        otherCatalog.resolve({ retcode: 0, message: "OK", data: { list: [] } });
      }
    },
  );
});
