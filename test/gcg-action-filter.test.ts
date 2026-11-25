/**
 * 七圣召唤行动牌筛选浮层与草稿状态回归测试。
 * @since Beta v0.14.1
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";

import TwfFilterShell from "@comp/pageWiki/twf-filter-shell.vue";
import GcgActionFilter from "@comp/userGcg/gcg-action-filter.vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as Vue from "vue";
import { compileScript, compileTemplate, parse } from "vue/compiler-sfc";

vi.mock("@comp/app/top-overlay.vue", async () => {
  const { defineComponent, h } = await import("vue");

  return {
    default: defineComponent({
      name: "MockTopOverlay",
      props: {
        modelValue: { type: Boolean, default: false },
      },
      emits: ["update:modelValue"],
      setup(props, { emit, slots }) {
        return () =>
          props.modelValue
            ? h("section", { class: "mock-overlay", role: "dialog" }, [
                h(
                  "button",
                  {
                    class: "mock-overlay-close",
                    type: "button",
                    onClick: () => emit("update:modelValue", false),
                  },
                  "关闭",
                ),
                slots.header?.(),
                h("div", { class: "mock-overlay-content" }, slots.default?.()),
                slots.footerStart?.(),
                slots.footer?.(),
              ])
            : null;
      },
    }),
  };
});

/** 编译真实筛选组件模板供自定义渲染器执行。 @since Beta v0.14.1 */
function compileRender(path: string): Vue.RenderFunction {
  const filename = fileURLToPath(new URL(path, import.meta.url));
  const descriptor = parse(readFileSync(filename, "utf8"), { filename }).descriptor;
  const id = "gcg-action-filter-regression";
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

TwfFilterShell.render = compileRender("../src/components/pageWiki/twf-filter-shell.vue");
GcgActionFilter.render = compileRender("../src/components/userGcg/gcg-action-filter.vue");

/** 自定义渲染器中的元素、文本与注释节点。 @since Beta v0.14.1 */
type HostNode = {
  type: string;
  parent: HostNode | null;
  children: Array<HostNode>;
  props: Record<string, unknown>;
  text: string;
};

/** 挂载后的筛选组件、页面节点与父级选择状态。 @since Beta v0.14.1 */
type MountedFilter = {
  app: Vue.App;
  body: HostNode;
  root: HostNode;
  selection: Vue.Ref<TGApp.Game.CardSquare.CatalogSelection>;
};

const filters: TGApp.Game.CardSquare.Filters = {
  role_element: [],
  action_type: [
    { id: 101, name: "战斗行动" },
    { id: 102, name: "支援" },
  ],
  action_tag: [{ id: 202, name: "装备" }],
  action_cost: [{ id: 303, name: "三费" }],
};

const disposals: Array<() => void> = [];

/** 创建一个自定义渲染器节点。 @since Beta v0.14.1 */
function createNode(type: string = "node"): HostNode {
  return { type, parent: null, children: [], props: {}, text: "" };
}

/** 创建测试用的 v-btn 替身，保留点击事件和可查询属性。 @since Beta v0.14.1 */
const VBtnStub = Vue.defineComponent({
  name: "VBtnStub",
  props: {
    ariaLabel: { type: String, default: undefined },
    class: { type: String, default: undefined },
    icon: { type: String, default: undefined },
    title: { type: String, default: undefined },
  },
  emits: { click: () => true },
  setup(props, { emit, slots }) {
    return () =>
      Vue.h(
        "button",
        {
          "aria-label": props.ariaLabel,
          class: props.class,
          "data-icon": props.icon,
          title: props.title,
          type: "button",
          onClick: () => emit("click"),
        },
        slots.default?.(),
      );
  },
});

/** 递归寻找满足条件的渲染节点。 @since Beta v0.14.1 */
function findNode(root: HostNode, predicate: (node: HostNode) => boolean): HostNode | undefined {
  if (predicate(root)) return root;
  for (const child of root.children) {
    const result = findNode(child, predicate);
    if (result) return result;
  }
  return undefined;
}

/** 递归收集满足条件的渲染节点。 @since Beta v0.14.1 */
function findNodes(root: HostNode, predicate: (node: HostNode) => boolean): Array<HostNode> {
  const matches: Array<HostNode> = [];
  if (predicate(root)) matches.push(root);
  for (const child of root.children) matches.push(...findNodes(child, predicate));
  return matches;
}

/** 触发自定义节点上的点击事件。 @since Beta v0.14.1 */
function click(node: HostNode): void {
  const handler = node.props.onClick;
  if (typeof handler === "function") handler();
}

/** 判断节点是否含有指定 CSS class。 @since Beta v0.14.1 */
function hasClass(node: HostNode, name: string): boolean {
  return typeof node.props.class === "string" && node.props.class.split(" ").includes(name);
}

/** 获取节点及其后代的文本内容。 @since Beta v0.14.1 */
function nodeText(node: HostNode): string {
  return node.text + node.children.map(nodeText).join("");
}

/** 按可见分组标题与选项名称定位真实筛选按钮。 @since Beta v0.14.1 */
function filterOption(body: HostNode, label: string, name: string): HostNode {
  const heading = findNode(body, (node) => node.type === "h3" && nodeText(node).trim() === label);
  const option = heading?.parent
    ? findNode(heading.parent, (node) => node.type === "button" && nodeText(node).trim() === name)
    : undefined;
  if (!option) throw new Error(`未找到${label}筛选项：${name}`);
  return option;
}

/** 创建支持 Teleport body 目标的最小自定义渲染器。 @since Beta v0.14.1 */
function createRenderer(body: HostNode): Vue.Renderer<HostNode> {
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
      if (value === undefined) delete node.props[key];
      else node.props[key] = value;
    },
    insert: (node, parent, anchor) => {
      if (node.parent) {
        node.parent.children = node.parent.children.filter((child) => child !== node);
      }
      node.parent = parent;
      const index = anchor ? parent.children.indexOf(anchor) : -1;
      if (index < 0) parent.children.push(node);
      else parent.children.splice(index, 0, node);
    },
    remove: (node) => {
      if (!node?.parent) return;
      const parent = node.parent;
      parent.children = parent.children.filter((child) => child !== node);
      node.parent = null;
    },
    querySelector: (selector) => (selector === "body" ? body : null),
  });
}

/** 挂载真实行动牌筛选组件。 @since Beta v0.14.1 */
function mountFilter(initial: TGApp.Game.CardSquare.CatalogSelection): MountedFilter {
  const body = createNode("body");
  const root = createNode("root");
  const selection = Vue.ref<TGApp.Game.CardSquare.CatalogSelection>({ ...initial });
  const renderer = createRenderer(body);
  const app = renderer.createApp({
    setup() {
      return () =>
        Vue.h(GcgActionFilter, {
          filters,
          modelValue: selection.value,
          "onUpdate:modelValue": (value: TGApp.Game.CardSquare.CatalogSelection) => {
            selection.value = value;
          },
        });
    },
  });
  app.component("v-btn", VBtnStub);
  app.provide(Vue.ssrContextKey, {});
  app.mount(root);
  disposals.push(() => app.unmount());
  return { app, body, root, selection };
}

/** 等待 Vue 的响应式更新与 Teleport 插入完成。 @since Beta v0.14.1 */
async function settle(): Promise<void> {
  await Vue.nextTick();
  await Promise.resolve();
  await Vue.nextTick();
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  for (const dispose of disposals.splice(0)) dispose();
});

describe("行动牌筛选浮层", () => {
  it("将打开后的浮层插入 body，而不是裁剪在触发器所在根节点", async () => {
    const mounted = mountFilter({
      element: 7,
      actionType: null,
      actionTag: null,
      actionCost: null,
    });
    const trigger = findNode(mounted.root, (node) => hasClass(node, "gcg-filter-trigger"));
    if (!trigger) throw new Error("未找到行动牌筛选触发器");

    expect(findNode(mounted.body, (node) => hasClass(node, "mock-overlay"))).toBeUndefined();
    click(trigger);
    await settle();

    expect(findNode(mounted.body, (node) => hasClass(node, "mock-overlay"))).toBeDefined();
    expect(findNode(mounted.root, (node) => hasClass(node, "mock-overlay"))).toBeUndefined();
  });

  it("应用草稿时一次更新三个筛选项并保留元素条件", async () => {
    const mounted = mountFilter({
      element: 7,
      actionType: null,
      actionTag: null,
      actionCost: null,
    });
    const trigger = findNode(mounted.root, (node) => hasClass(node, "gcg-filter-trigger"));
    if (!trigger) throw new Error("未找到行动牌筛选触发器");
    click(trigger);
    await settle();

    click(filterOption(mounted.body, "类型", "战斗行动"));
    click(filterOption(mounted.body, "标签", "装备"));
    click(filterOption(mounted.body, "花费", "三费"));
    await settle();
    expect(mounted.selection.value).toEqual({
      element: 7,
      actionType: null,
      actionTag: null,
      actionCost: null,
    });

    const buttons = findNodes(mounted.body, (node) => node.type === "button");
    const apply = buttons.find((node) => nodeText(node).trim() === "应用");
    const reset = buttons.find((node) => nodeText(node).trim() === "重置");
    expect(reset).toBeDefined();
    expect(apply).toBeDefined();
    if (!apply) throw new Error("未找到应用按钮");
    click(apply);
    await settle();

    expect(mounted.selection.value).toEqual({
      element: 7,
      actionType: 101,
      actionTag: 202,
      actionCost: 303,
    });
    expect(findNode(mounted.body, (node) => hasClass(node, "mock-overlay"))).toBeUndefined();
  });

  it("重开时恢复已应用条件，重置后应用会清除三个筛选项", async () => {
    const mounted = mountFilter({ element: 7, actionType: null, actionTag: 202, actionCost: 303 });
    const trigger = findNode(mounted.root, (node) => hasClass(node, "gcg-filter-trigger"));
    if (!trigger) throw new Error("未找到行动牌筛选触发器");
    click(trigger);
    await settle();

    expect(filterOption(mounted.body, "类型", "不限").props["aria-pressed"]).toBe(true);
    expect(filterOption(mounted.body, "标签", "装备").props["aria-pressed"]).toBe(true);
    expect(filterOption(mounted.body, "花费", "三费").props["aria-pressed"]).toBe(true);
    click(filterOption(mounted.body, "类型", "战斗行动"));
    await settle();
    expect(mounted.selection.value).toEqual({
      element: 7,
      actionType: null,
      actionTag: 202,
      actionCost: 303,
    });

    const close = findNode(mounted.body, (node) => hasClass(node, "mock-overlay-close"));
    if (!close) throw new Error("未找到关闭按钮");
    click(close);
    await settle();
    expect(mounted.selection.value).toEqual({
      element: 7,
      actionType: null,
      actionTag: 202,
      actionCost: 303,
    });
    click(trigger);
    await settle();
    expect(filterOption(mounted.body, "类型", "不限").props["aria-pressed"]).toBe(true);
    expect(filterOption(mounted.body, "标签", "装备").props["aria-pressed"]).toBe(true);
    expect(filterOption(mounted.body, "花费", "三费").props["aria-pressed"]).toBe(true);
    const reset = findNodes(mounted.body, (node) => node.type === "button").find(
      (node) => nodeText(node).trim() === "重置",
    );
    if (!reset) throw new Error("未找到重置按钮");
    click(reset);
    await settle();
    for (const label of ["类型", "标签", "花费"]) {
      expect(filterOption(mounted.body, label, "不限").props["aria-pressed"]).toBe(true);
    }
    const apply = findNodes(mounted.body, (node) => node.type === "button").find(
      (node) => nodeText(node).trim() === "应用",
    );
    if (!apply) throw new Error("未找到应用按钮");
    click(apply);
    await settle();

    expect(mounted.selection.value).toEqual({
      element: 7,
      actionType: null,
      actionTag: null,
      actionCost: null,
    });
  });

  it("每组保持单选，支持再次点击取消与选择不限", async () => {
    const mounted = mountFilter({
      element: 7,
      actionType: null,
      actionTag: null,
      actionCost: null,
    });
    const trigger = findNode(mounted.root, (node) => hasClass(node, "gcg-filter-trigger"));
    if (!trigger) throw new Error("未找到行动牌筛选触发器");
    click(trigger);
    await settle();

    click(filterOption(mounted.body, "类型", "战斗行动"));
    await settle();
    expect(filterOption(mounted.body, "类型", "战斗行动").props["aria-pressed"]).toBe(true);
    expect(filterOption(mounted.body, "类型", "不限").props["aria-pressed"]).toBe(false);

    click(filterOption(mounted.body, "类型", "支援"));
    await settle();
    expect(filterOption(mounted.body, "类型", "战斗行动").props["aria-pressed"]).toBe(false);
    expect(filterOption(mounted.body, "类型", "支援").props["aria-pressed"]).toBe(true);

    click(filterOption(mounted.body, "类型", "支援"));
    await settle();
    expect(filterOption(mounted.body, "类型", "支援").props["aria-pressed"]).toBe(false);
    expect(filterOption(mounted.body, "类型", "不限").props["aria-pressed"]).toBe(true);

    click(filterOption(mounted.body, "标签", "装备"));
    click(filterOption(mounted.body, "花费", "三费"));
    await settle();
    click(filterOption(mounted.body, "标签", "不限"));
    await settle();
    expect(filterOption(mounted.body, "标签", "不限").props["aria-pressed"]).toBe(true);
    expect(filterOption(mounted.body, "标签", "装备").props["aria-pressed"]).toBe(false);
    expect(filterOption(mounted.body, "花费", "三费").props["aria-pressed"]).toBe(true);

    const apply = findNode(
      mounted.body,
      (node) => node.type === "button" && nodeText(node).trim() === "应用",
    );
    if (!apply) throw new Error("未找到应用按钮");
    click(apply);
    await settle();
    expect(mounted.selection.value).toEqual({
      element: 7,
      actionType: null,
      actionTag: null,
      actionCost: 303,
    });
  });
});
