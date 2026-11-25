/**
 * 七圣召唤图鉴网格的可视范围渲染回归测试。
 * @since Beta v0.14.1
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as Vue from "vue";
import { compileScript, compileTemplate, parse } from "vue/compiler-sfc";

const tileEmits = vi.fn();

vi.mock("@comp/pageWiki/twg-card-tile.vue", () => ({
  default: Vue.defineComponent({
    name: "MockTwgCardTile",
    props: ["card"],
    emits: ["openDetails"],
    setup(props, { emit }) {
      return () =>
        Vue.h(
          "article",
          {
            "data-card-id": (<TGApp.Game.CardSquare.Card>props.card).basic.item_id,
            onClick: () => {
              tileEmits();
              emit("openDetails");
            },
          },
          String((<TGApp.Game.CardSquare.Card>props.card).basic.name),
        );
    },
  }),
}));

import GcgCatalogGrid from "../src/components/userGcg/gcg-catalog-grid.vue";

/** 编译真实网格模板供自定义渲染器执行。 @since Beta v0.14.1 */
function compileRender(path: string): Vue.RenderFunction {
  const filename = fileURLToPath(new URL(path, import.meta.url));
  const descriptor = parse(readFileSync(filename, "utf8"), { filename }).descriptor;
  const id = "gcg-catalog-grid-regression";
  const code = compileTemplate({
    filename,
    id,
    source: descriptor.template?.content ?? "",
    compilerOptions: {
      bindingMetadata: compileScript(descriptor, { id }).bindings,
      mode: "function",
    },
  }).code;
  return runInNewContext(`(function(Vue) {${code}})(Vue)`, { Vue });
}

GcgCatalogGrid.render = compileRender("../src/components/userGcg/gcg-catalog-grid.vue");

/** 自定义渲染器中的元素、文本与注释节点。 @since Beta v0.14.1 */
type HostNode = {
  type: string;
  parent: HostNode | null;
  children: Array<HostNode>;
  props: Record<string, unknown>;
  text: string;
  clientWidth: number;
  hasAttribute: (name: string) => boolean;
  setAttribute: (name: string, value: string) => void;
  getBoundingClientRect: () => { top: number; bottom: number; height: number };
};

type TestIntersectionEntry = {
  target: HostNode;
  isIntersecting: boolean;
  intersectionRatio: number;
  intersectionRect: { height: number };
  boundingClientRect: { height: number };
  rootBounds: { height: number };
};

type TestIntersectionObserver = {
  options: IntersectionObserverInit;
  targets: Set<HostNode>;
  disconnected: boolean;
  emit: (entries: Array<TestIntersectionEntry>) => void;
};

const intersectionObservers: Array<TestIntersectionObserver> = [];
const resizeObservers: Array<{
  targets: Set<HostNode>;
  disconnected: boolean;
  emit: (target: HostNode) => void;
}> = [];

/** 创建自定义渲染器节点。 @since Beta v0.14.1 */
function createNode(type: string = "node"): HostNode {
  const props: Record<string, unknown> = {};
  const node: HostNode = {
    type,
    parent: null,
    children: [],
    props,
    text: "",
    clientWidth: 640,
    hasAttribute: (name) => Object.prototype.hasOwnProperty.call(props, name),
    setAttribute: (name, value) => {
      props[name] = value;
    },
    getBoundingClientRect: () => ({ top: 0, bottom: 640, height: 640 }),
  };
  return node;
}

/** 递归收集满足条件的节点。 @since Beta v0.14.1 */
function findNodes(root: HostNode, predicate: (node: HostNode) => boolean): Array<HostNode> {
  const matches: Array<HostNode> = [];
  if (predicate(root)) matches.push(root);
  for (const child of root.children) matches.push(...findNodes(child, predicate));
  return matches;
}

/** 获取卡牌替身的 ID。 @since Beta v0.14.1 */
function cardIds(root: HostNode): Array<number> {
  return findNodes(root, (node) => node.type === "article").flatMap((node) => {
    const id = Number(node.props["data-card-id"]);
    return Number.isInteger(id) ? [id] : [];
  });
}

/** 获取卡面所属的网格项。 @since Beta v0.14.1 */
function cardCell(root: HostNode, id: number): HostNode | undefined {
  const card = findNodes(
    root,
    (node) => node.type === "article" && Number(node.props["data-card-id"]) === id,
  )[0];
  let current = card?.parent;
  while (current && current.type !== "li") current = current.parent;
  return current ?? undefined;
}

/** 将节点样式转换为可检查的键值记录。 @since Beta v0.14.1 */
function toStyleRecord(value: object): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value));
}

/** 获取节点样式对象，兼容 Vue 合并 style 数组。 @since Beta v0.14.1 */
function styleEntries(node: HostNode): Array<Record<string, unknown>> {
  const style = node.props.style;
  if (Array.isArray(style)) {
    return style.flatMap((entry) =>
      entry && typeof entry === "object" ? [toStyleRecord(entry)] : [],
    );
  }
  return style && typeof style === "object" ? [toStyleRecord(style)] : [];
}

/** 获取可见范围观察器。 @since Beta v0.14.1 */
function visibilityObserver(): TestIntersectionObserver {
  const observer = intersectionObservers.find((item) => {
    const threshold = item.options.threshold;
    return (Array.isArray(threshold) ? threshold : [threshold ?? 0]).includes(0.25);
  });
  if (!observer) throw new Error("未找到可见范围观察器");
  return observer;
}

/** 获取预加载与卸载观察器。 @since Beta v0.14.1 */
function preloadObserver(): TestIntersectionObserver {
  const observer = intersectionObservers.find((item) => item.options.rootMargin?.includes("360px"));
  if (!observer) throw new Error("未找到预加载观察器");
  return observer;
}

/** 创建测试卡牌。 @since Beta v0.14.1 */
function createCard(id: number): TGApp.Game.CardSquare.RoleCard {
  return {
    basic: {
      item_id: id,
      name: `卡牌${id}`,
      icon: `/card/${id}.webp`,
      icon_small: `/card/${id}-small.webp`,
      wiki_url: "",
      max_cnt: 1,
    },
    element: 1,
    hp: 10,
    skill_cost: 1,
  };
}

/** 生成交叉观察器条目。 @since Beta v0.14.1 */
function intersectionEntry(target: HostNode, visible: boolean): TestIntersectionEntry {
  return {
    target,
    isIntersecting: visible,
    intersectionRatio: visible ? 1 : 0,
    intersectionRect: { height: visible ? 120 : 0 },
    boundingClientRect: { height: 120 },
    rootBounds: { height: 500 },
  };
}

/** 生成指定可见高度的交叉观察器条目。 @since Beta v0.14.1 */
function partialIntersectionEntry(
  target: HostNode,
  intersectionHeight: number,
): TestIntersectionEntry {
  return {
    ...intersectionEntry(target, true),
    intersectionRect: { height: intersectionHeight },
  };
}

/** 等待 Vue 的响应式更新。 @since Beta v0.14.1 */
async function settle(): Promise<void> {
  await Vue.nextTick();
  await Promise.resolve();
  await Vue.nextTick();
}

/** 创建支持观察器的自定义渲染器。 @since Beta v0.14.1 */
function createRenderer(): Vue.Renderer<HostNode> {
  return Vue.createRenderer<HostNode, HostNode>({
    createElement: createNode,
    createText: (text) => ({ ...createNode("#text"), text }),
    createComment: (text) => ({ ...createNode("#comment"), text }),
    setText: (node, text) => (node.text = text),
    setElementText: (node, text) => {
      node.text = text;
      for (const child of node.children) child.parent = null;
      node.children = [];
    },
    parentNode: (node) => node.parent,
    nextSibling: (node) => {
      const parent = node.parent;
      if (!parent) return null;
      const index = parent.children.indexOf(node);
      return index < 0 ? null : (parent.children[index + 1] ?? null);
    },
    patchProp: (node, key, _previous, value) => {
      if (value === undefined || value === null) delete node.props[key];
      else node.props[key] = value;
    },
    insert: (node, parent, anchor) => {
      if (node.parent)
        node.parent.children = node.parent.children.filter((child) => child !== node);
      node.parent = parent;
      const index = anchor ? parent.children.indexOf(anchor) : -1;
      if (index < 0) parent.children.push(node);
      else parent.children.splice(index, 0, node);
    },
    remove: (node) => {
      if (!node.parent) return;
      node.parent.children = node.parent.children.filter((child) => child !== node);
      node.parent = null;
    },
    querySelector: () => null,
  });
}

type MountedGrid = {
  app: Vue.App;
  root: HostNode;
  cards: Vue.Ref<Array<TGApp.Game.CardSquare.Card>>;
  selected: Vue.Ref<Array<number>>;
};

/** 挂载图鉴网格。 @since Beta v0.14.1 */
function mountGrid(initialCards: Array<TGApp.Game.CardSquare.Card>): MountedGrid {
  const root = createNode("root");
  const cards = Vue.ref<Array<TGApp.Game.CardSquare.Card>>(initialCards);
  const selected = Vue.ref<Array<number>>([]);
  const app = createRenderer().createApp({
    setup() {
      return () =>
        Vue.h(GcgCatalogGrid, {
          cards: cards.value,
          onSelect: (card: TGApp.Game.CardSquare.Card) => selected.value.push(card.basic.item_id),
        });
    },
  });
  app.provide(Vue.ssrContextKey, {});
  app.mount(root);
  return { app, root, cards, selected };
}

beforeEach(() => {
  intersectionObservers.length = 0;
  resizeObservers.length = 0;
  tileEmits.mockClear();
  let headerOffset = "100px";
  vi.stubGlobal("Element", Object);
  vi.stubGlobal("window", {
    innerHeight: 600,
    getComputedStyle: () => ({ getPropertyValue: () => headerOffset }),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    matchMedia: () => ({ matches: false }),
    setHeaderOffset: (value: string) => {
      headerOffset = value;
    },
  });
  vi.stubGlobal(
    "IntersectionObserver",
    <typeof IntersectionObserver>(<unknown>class {
      readonly options: IntersectionObserverInit;
      readonly targets = new Set<HostNode>();
      disconnected = false;
      private readonly callback: (entries: Array<TestIntersectionEntry>) => void;

      constructor(
        callback: (entries: Array<TestIntersectionEntry>) => void,
        options: IntersectionObserverInit = {},
      ) {
        this.callback = callback;
        this.options = options;
        intersectionObservers.push(this);
      }

      observe(target: HostNode): void {
        this.targets.add(target);
      }

      unobserve(target: HostNode): void {
        this.targets.delete(target);
      }

      disconnect(): void {
        this.disconnected = true;
        this.targets.clear();
      }

      emit(entries: Array<TestIntersectionEntry>): void {
        this.callback(entries);
      }
    }),
  );
  vi.stubGlobal(
    "ResizeObserver",
    <typeof ResizeObserver>(<unknown>class {
      readonly targets = new Set<HostNode>();
      disconnected = false;
      private readonly callback: ResizeObserverCallback;

      constructor(callback: ResizeObserverCallback) {
        this.callback = callback;
        resizeObservers.push(this);
      }

      observe(target: HostNode): void {
        this.targets.add(target);
      }

      unobserve(target: HostNode): void {
        this.targets.delete(target);
      }

      disconnect(): void {
        this.disconnected = true;
        this.targets.clear();
      }

      emit(target: HostNode): void {
        this.callback(
          [
            {
              target: <Element>(<unknown>target),
              contentRect: <DOMRectReadOnly>{},
              borderBoxSize: [{ blockSize: 640, inlineSize: target.clientWidth }],
              contentBoxSize: [],
              devicePixelContentBoxSize: [],
            },
          ],
          <ResizeObserver>(<unknown>this),
        );
      }
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("七圣召唤图鉴可视范围网格", () => {
  it("只在 360px 缓冲区内挂载卡面，并在滚出后卸载、重新进入后恢复", async () => {
    const cards = Array.from({ length: 500 }, (_, index) => createCard(index + 1));
    const mounted = mountGrid(cards);
    try {
      await settle();
      expect(findNodes(mounted.root, (node) => node.type === "li")).toHaveLength(500);
      expect(cardIds(mounted.root)).toEqual([]);

      const preload = preloadObserver();
      const targets = [...preload.targets];
      expect(targets).toHaveLength(500);
      preload.emit([intersectionEntry(targets[0], true), intersectionEntry(targets[1], true)]);
      await settle();
      expect(cardIds(mounted.root)).toEqual([1, 2]);

      preload.emit([intersectionEntry(targets[0], false)]);
      await settle();
      expect(cardIds(mounted.root)).toEqual([2]);
      preload.emit([intersectionEntry(targets[0], true)]);
      await settle();
      expect(cardIds(mounted.root)).toEqual([1, 2]);
    } finally {
      mounted.app.unmount();
    }
  });

  it("按可见阈值安排进入动画，筛选重排保持键稳定并清理观察器", async () => {
    const mounted = mountGrid([createCard(1), createCard(2), createCard(3)]);
    try {
      await settle();
      const preload = preloadObserver();
      const targets = [...preload.targets];
      preload.emit(targets.map((target) => intersectionEntry(target, true)));
      await settle();

      const firstCell = cardCell(mounted.root, 1);
      const visible = visibilityObserver();
      if (!firstCell) throw new Error("未找到第一张卡片网格项");
      visible.emit([intersectionEntry(firstCell, true)]);
      await settle();
      const firstStyle = styleEntries(firstCell);
      expect(String(firstCell.props.class)).toContain("visible");
      expect(firstStyle[0]?.["--masonry-flow-entry-delay"]).toBe("0ms");
      expect(firstStyle[0]?.["--masonry-flow-entry-duration"]).toBe("1000ms");
      expect(cardIds(mounted.root)).toContain(1);
      visible.emit([partialIntersectionEntry(firstCell, 10)]);
      await settle();
      expect(String(firstCell.props.class)).not.toContain("visible");
      expect(cardIds(mounted.root)).toContain(1);
      visible.emit([intersectionEntry(firstCell, true)]);
      await settle();
      expect(styleEntries(firstCell)[0]?.["--masonry-flow-entry-duration"]).toBe("520ms");

      const firstCellBeforeReorder = cardCell(mounted.root, 1);
      mounted.cards.value = [createCard(3), createCard(1)];
      await settle();
      expect(cardIds(mounted.root)).toEqual([3, 1]);
      expect(cardCell(mounted.root, 1)).toBe(firstCellBeforeReorder);

      const root = findNodes(mounted.root, (node) => node.type === "ul" || node.type === "ol")[0];
      if (!root) throw new Error("未找到图鉴网格根节点");
      const previousVisibility = visibilityObserver();
      const observerCount = intersectionObservers.length;
      (<{ setHeaderOffset: (value: string) => void }>(<unknown>window)).setHeaderOffset("128px");
      const resize = resizeObservers[0];
      if (!resize) throw new Error("未找到网格 ResizeObserver");
      resize.emit(root);
      await settle();
      expect(intersectionObservers.length).toBeGreaterThan(observerCount);
      expect(previousVisibility.disconnected).toBe(true);
    } finally {
      mounted.app.unmount();
      expect(intersectionObservers.every((observer) => observer.disconnected)).toBe(true);
      expect(resizeObservers.every((observer) => observer.disconnected)).toBe(true);
    }
  });

  it("点击卡面只发出一次 select 事件", async () => {
    const mounted = mountGrid([createCard(7)]);
    try {
      await settle();
      const placeholder = findNodes(mounted.root, (node) => node.type === "li")[0];
      if (!placeholder) throw new Error("未找到卡面占位项");
      const placeholderClick = placeholder.props.onClick;
      if (typeof placeholderClick !== "function") throw new Error("占位项没有点击处理器");
      placeholderClick();
      await settle();
      expect(mounted.selected.value).toEqual([]);

      const preload = preloadObserver();
      const [target] = [...preload.targets];
      if (!target) throw new Error("未找到卡面占位项");
      preload.emit([intersectionEntry(target, true)]);
      await settle();
      visibilityObserver().emit([intersectionEntry(target, true)]);
      await settle();

      const card = findNodes(
        mounted.root,
        (node) => node.type === "article" && Number(node.props["data-card-id"]) === 7,
      )[0];
      if (!card) throw new Error("未找到已挂载卡面");
      const click = card.props.onClick;
      if (typeof click !== "function") throw new Error("卡面没有点击处理器");
      click();
      await settle();
      expect(tileEmits).toHaveBeenCalledOnce();
      expect(mounted.selected.value).toEqual([7]);
    } finally {
      mounted.app.unmount();
    }
  });
});
