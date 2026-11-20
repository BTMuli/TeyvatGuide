/**
 * 米游社云草稿列表异步状态回归测试。
 * @since Beta v0.13.2
 */

import { readFileSync } from "node:fs";

import ts from "typescript";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as Vue from "vue";
import { compileScript, parse } from "vue/compiler-sfc";

type DraftItem = {
  id: string;
  subject: string;
  viewType: number;
  gid: number;
  updatedAt: number;
};

type DraftResponse = {
  retcode: number;
  message: string;
  data: { list: Array<DraftItem>; is_last: boolean; next_offset: string };
};

type DeleteResponse = {
  retcode: number;
  message: string;
  data: unknown;
};

type HostNode = {
  parent: HostNode | null;
  children: Array<HostNode>;
  text: string;
};

/** 草稿列表的真实响应式状态与打开操作。 @since Beta v0.13.1 */
type DraftListBindings = {
  visible: Vue.Ref<boolean>;
  drafts: Vue.Ref<Array<DraftItem>>;
  viewType: Vue.Ref<number>;
  deletingId: Vue.Ref<string | undefined>;
  deleteDraft: (draft: DraftItem) => Promise<void>;
  openDraft: (draft: DraftItem) => Promise<void>;
};

type CompiledDraftList = {
  default: {
    setup: (props: Record<string, unknown>, context: Vue.SetupContext) => DraftListBindings;
  };
};

const source = readFileSync(
  new URL("../src/components/viewPost/vp-post-drafts.vue", import.meta.url),
  "utf8",
);
const script = compileScript(parse(source).descriptor, { id: "post-drafts-state-regression" });
const compiled = ts.transpileModule(script.content, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

const list = vi.fn();
const detail = vi.fn();
const deleteDraftRequest =
  vi.fn<(id: string, cookie: { ltoken_v2: string; ltuid_v2: string }) => Promise<DeleteResponse>>();
const dialogCheck =
  vi.fn<
    (options: {
      title: string;
      text: string;
      confirmLabel: string;
      cancelLabel: string;
    }) => Promise<boolean | undefined>
  >();
const snackbarError = vi.fn();
const snackbarSuccess = vi.fn();
const snackbarWarn = vi.fn();
const account = {
  uid: Vue.ref<string>("1001"),
  cookie: Vue.ref({ ltoken_v2: "token-1001", ltuid_v2: "1001" }),
};
const routerPush = vi.fn();
const dispose: Array<() => void> = [];

/**
 * 创建一个列表草稿。
 * @since Beta v0.13.1
 * @param id - 草稿 ID
 * @param subject - 草稿标题
 * @returns 草稿列表项
 */
function createDraft(id: string, subject: string): DraftItem {
  return { id, subject, viewType: 1, gid: 2, updatedAt: 1 };
}

/**
 * 创建列表响应。
 * @since Beta v0.13.1
 * @param items - 列表项
 * @returns 模拟请求响应
 */
function listResponse(...items: Array<DraftItem>): DraftResponse {
  return { retcode: 0, message: "OK", data: { list: items, is_last: true, next_offset: "0" } };
}

/**
 * 创建带分页游标的列表响应。
 * @since Beta v0.13.1
 * @param items - 列表项
 * @param isLast - 是否为最后一页
 * @param nextOffset - 下一页游标
 * @returns 模拟分页响应
 */
function pagedListResponse(
  items: Array<DraftItem>,
  isLast: boolean,
  nextOffset: string,
): DraftResponse {
  return {
    retcode: 0,
    message: "OK",
    data: { list: items, is_last: isLast, next_offset: nextOffset },
  };
}

/**
 * 创建一个可控制完成顺序的 Promise。
 * @since Beta v0.13.1
 * @returns Promise 与完成函数
 */
function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((callback) => (resolve = callback));
  return { promise, resolve };
}

/**
 * 创建轻量渲染节点。
 * @since Beta v0.13.1
 * @returns 测试渲染节点
 */
function createNode(): HostNode {
  return Vue.markRaw({ parent: null, children: [], text: "" });
}

/**
 * 挂载真实草稿列表 setup，仅替换网络、账号和浮层子组件。
 * @since Beta v0.13.1
 * @param gid - 打开草稿箱时选择的分区
 * @returns 列表响应式状态
 */
function mountDraftList(gid: number = 2): DraftListBindings {
  const dependencies: Record<string, unknown> = {
    vue: Vue,
    pinia: { storeToRefs: (store: unknown) => store },
    "vue-router": { useRouter: () => ({ push: routerPush }) },
    "@comp/app/top-overlay.vue": {},
    "@comp/app/t-state-panel.vue": {},
    "@comp/func/dialog.js": { checkF: dialogCheck },
    "@comp/func/snackbar.js": {
      error: snackbarError,
      success: snackbarSuccess,
      warn: snackbarWarn,
    },
    "@req/postDraftReq.js": { list, detail, delete: deleteDraftRequest },
    "@store/user.js": () => account,
    "@utils/bbs/replyAccount.js": {
      matchesCurrentAccount: (snapshot: {
        uid: string;
        cookie: { ltuid_v2: string; ltoken_v2: string };
      }) =>
        snapshot.uid === account.uid.value &&
        snapshot.cookie.ltuid_v2 === account.cookie.value.ltuid_v2 &&
        snapshot.cookie.ltoken_v2 === account.cookie.value.ltoken_v2,
      executeReplyForCurrentAccount: async <T>(
        snapshot: { uid: string; cookie: { ltuid_v2: string; ltoken_v2: string } },
        action: () => Promise<T>,
      ): Promise<{ allowed: false } | { allowed: true; data: T }> => {
        const isCurrent =
          snapshot.uid === account.uid.value &&
          snapshot.cookie.ltuid_v2 === account.cookie.value.ltuid_v2 &&
          snapshot.cookie.ltoken_v2 === account.cookie.value.ltoken_v2;
        if (!isCurrent) return { allowed: false };
        return { allowed: true, data: await action() };
      },
    },
    "@utils/network/TGHttps.js": {
      getErrMsg: (cause: unknown) => (cause instanceof Error ? cause.message : String(cause)),
    },
  };
  const module = { exports: <CompiledDraftList>{} };
  new Function("require", "module", "exports", compiled)(
    (id: string) => {
      if (!(id in dependencies)) throw new Error(`未配置的草稿列表依赖：${id}`);
      return dependencies[id];
    },
    module,
    module.exports,
  );
  let bindings: DraftListBindings | undefined;
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
    props: {
      modelValue: { type: Boolean, default: false },
      gid: { type: Number, default: gid },
    },
    setup(props, context) {
      bindings = module.exports.default.setup(props, context);
      return () => Vue.h("section");
    },
  });
  app.mount(createNode());
  dispose.push(() => app.unmount());
  if (!bindings) throw new Error("草稿列表未完成初始化");
  return bindings;
}

/**
 * 等待请求 Promise 与 Vue 更新队列。
 * @since Beta v0.13.1
 */
async function settle(): Promise<void> {
  for (let index = 0; index < 8; index += 1) {
    await Promise.resolve();
    await Vue.nextTick();
  }
}

beforeEach(() => {
  vi.resetAllMocks();
  account.uid.value = "1001";
  account.cookie.value = { ltoken_v2: "token-1001", ltuid_v2: "1001" };
  list.mockResolvedValue(listResponse(createDraft("draft-1", "默认草稿")));
  dialogCheck.mockResolvedValue(false);
  deleteDraftRequest.mockResolvedValue({ retcode: 0, message: "OK", data: null });
});

afterEach(() => {
  for (const unmount of dispose.splice(0)) unmount();
});

describe("云草稿列表异步状态", () => {
  it.each([
    { listGid: 0, detailGid: 6, contextGid: 2, expectedGid: "6" },
    { listGid: 0, detailGid: 0, contextGid: 2, expectedGid: "2" },
    { listGid: 2, detailGid: 6, contextGid: 6, expectedGid: "2" },
  ])("打开草稿时解析有效分区：$listGid/$detailGid/$contextGid", async (input) => {
    const panel = mountDraftList(input.contextGid);
    panel.visible.value = true;
    await settle();
    const draft = { ...createDraft("123", "待编辑草稿"), gid: input.listGid };
    detail.mockResolvedValueOnce({
      retcode: 0,
      message: "OK",
      data: { settings: { gid: input.detailGid, viewType: 1 } },
    });

    await panel.openDraft(draft);

    expect(routerPush).toHaveBeenCalledWith({
      name: "新建帖子",
      params: { gid: input.expectedGid, viewType: "1" },
      query: { draft: "123", from: "profile" },
    });
    expect(panel.visible.value).toBe(false);
    expect(detail).toHaveBeenCalledTimes(input.listGid === 0 ? 1 : 0);
  });

  it("补查详情失败时保留草稿箱并显示错误", async () => {
    const panel = mountDraftList();
    panel.visible.value = true;
    await settle();
    detail.mockResolvedValueOnce({ retcode: -100, message: "登录已失效", data: null });

    await panel.openDraft({ ...createDraft("123", "待编辑草稿"), gid: 0 });

    expect(routerPush).not.toHaveBeenCalled();
    expect(panel.visible.value).toBe(true);
    expect(snackbarError).toHaveBeenCalledWith("[-100] 登录已失效");
  });

  it("补查详情期间切换账号时取消旧草稿跳转", async () => {
    const panel = mountDraftList();
    panel.visible.value = true;
    await settle();
    const request = deferred<{
      retcode: number;
      message: string;
      data: { settings: { gid: number; viewType: number } };
    }>();
    detail.mockReturnValueOnce(request.promise);
    const opening = panel.openDraft({ ...createDraft("123", "旧账号草稿"), gid: 0 });
    account.uid.value = "2002";
    account.cookie.value = { ltoken_v2: "token-2002", ltuid_v2: "2002" };
    await settle();
    request.resolve({ retcode: 0, message: "OK", data: { settings: { gid: 6, viewType: 1 } } });
    await opening;

    expect(routerPush).not.toHaveBeenCalled();
    expect(snackbarError).not.toHaveBeenCalled();
  });

  it("取消删除确认不会发起请求", async () => {
    const panel = mountDraftList();
    panel.visible.value = true;
    await settle();

    await panel.deleteDraft(panel.drafts.value[0]);

    expect(dialogCheck).toHaveBeenCalledWith({
      cancelLabel: "保留",
      confirmLabel: "删除",
      text: "删除米游社云端草稿后不可撤销，确认继续吗？",
      title: "删除草稿「默认草稿」？",
    });
    expect(deleteDraftRequest).not.toHaveBeenCalled();
    expect(panel.drafts.value.map((item) => item.id)).toEqual(["draft-1"]);
    expect(panel.deletingId.value).toBeUndefined();
  });

  it("确认后使用当前账号删除目标草稿并保留其他草稿", async () => {
    const first = createDraft("draft-1", "待删除草稿");
    const second = createDraft("draft-2", "保留草稿");
    list.mockResolvedValue(listResponse(first, second));
    dialogCheck.mockResolvedValue(true);
    const panel = mountDraftList();
    panel.visible.value = true;
    await settle();

    await panel.deleteDraft(first);

    expect(deleteDraftRequest).toHaveBeenCalledWith("draft-1", {
      ltoken_v2: "token-1001",
      ltuid_v2: "1001",
    });
    expect(panel.drafts.value).toEqual([second]);
    expect(snackbarSuccess).toHaveBeenCalledWith("草稿已删除");
    expect(panel.deletingId.value).toBeUndefined();
  });

  it("删除分页首屏最后一项后重置首屏并可继续读取", async () => {
    const first = createDraft("draft-1", "首屏草稿");
    const next = createDraft("draft-2", "后续草稿");
    list.mockReset();
    list
      .mockResolvedValueOnce(pagedListResponse([first], false, "20"))
      .mockResolvedValueOnce(listResponse(next));
    dialogCheck.mockResolvedValue(true);
    const panel = mountDraftList();
    panel.visible.value = true;
    await settle();

    await panel.deleteDraft(first);

    expect(list).toHaveBeenCalledTimes(2);
    expect(list.mock.calls[1][1]).toBe("0");
    expect(panel.drafts.value).toEqual([next]);
  });

  it("删除非末页中的一项后从首屏刷新并保留其余项目", async () => {
    const first = createDraft("draft-1", "待删除草稿");
    const second = createDraft("draft-2", "当前页保留草稿");
    const next = createDraft("draft-3", "后续页草稿");
    list.mockReset();
    list
      .mockResolvedValueOnce(pagedListResponse([first, second], false, "20"))
      .mockResolvedValueOnce(listResponse(second, next));
    dialogCheck.mockResolvedValue(true);
    const panel = mountDraftList();
    panel.visible.value = true;
    await settle();

    await panel.deleteDraft(first);

    expect(list).toHaveBeenCalledTimes(2);
    expect(list.mock.calls[1][1]).toBe("0");
    expect(panel.drafts.value).toEqual([second, next]);
  });

  it("删除失败时保留原草稿列表", async () => {
    const first = createDraft("draft-1", "删除失败草稿");
    const second = createDraft("draft-2", "保留草稿");
    list.mockResolvedValue(listResponse(first, second));
    dialogCheck.mockResolvedValue(true);
    deleteDraftRequest.mockResolvedValueOnce({ retcode: -1, message: "删除失败", data: null });
    const panel = mountDraftList();
    panel.visible.value = true;
    await settle();

    await panel.deleteDraft(first);

    expect(panel.drafts.value).toEqual([first, second]);
    expect(snackbarError).toHaveBeenCalledWith("[-1] 删除失败");
    expect(snackbarSuccess).not.toHaveBeenCalled();
    expect(panel.deletingId.value).toBeUndefined();
  });

  it("确认等待期间切换账号时不发送旧草稿删除请求", async () => {
    const confirmation = deferred<boolean>();
    dialogCheck.mockReturnValueOnce(confirmation.promise);
    const panel = mountDraftList();
    panel.visible.value = true;
    await settle();
    const deletion = panel.deleteDraft(panel.drafts.value[0]);
    await settle();

    account.uid.value = "2002";
    account.cookie.value = { ltoken_v2: "token-2002", ltuid_v2: "2002" };
    await settle();
    confirmation.resolve(true);
    await deletion;

    expect(deleteDraftRequest).not.toHaveBeenCalled();
    expect(snackbarSuccess).not.toHaveBeenCalled();
  });

  it("删除请求进行中禁止同一草稿箱重复删除", async () => {
    const first = createDraft("draft-1", "待删除草稿");
    const second = createDraft("draft-2", "另一份草稿");
    list.mockResolvedValue(listResponse(first, second));
    dialogCheck.mockResolvedValue(true);
    const request = deferred<DeleteResponse>();
    deleteDraftRequest.mockReturnValueOnce(request.promise);
    const panel = mountDraftList();
    panel.visible.value = true;
    await settle();

    const deletion = panel.deleteDraft(first);
    await settle();
    await panel.deleteDraft(second);

    expect(deleteDraftRequest).toHaveBeenCalledTimes(1);
    expect(panel.deletingId.value).toBe("draft-1");
    request.resolve({ retcode: 0, message: "OK", data: null });
    await deletion;
    expect(panel.drafts.value).toEqual([second]);
  });

  it("网络响应返回前切换账号时不更新旧草稿箱状态", async () => {
    const first = createDraft("draft-1", "旧账号草稿");
    const second = createDraft("draft-2", "保留草稿");
    list.mockReset();
    list
      .mockResolvedValueOnce(listResponse(first, second))
      .mockResolvedValueOnce(listResponse(createDraft("draft-new", "新账号草稿")));
    dialogCheck.mockResolvedValue(true);
    const request = deferred<DeleteResponse>();
    deleteDraftRequest.mockReturnValueOnce(request.promise);
    const panel = mountDraftList();
    panel.visible.value = true;
    await settle();

    const deletion = panel.deleteDraft(first);
    await settle();
    account.uid.value = "2002";
    account.cookie.value = { ltoken_v2: "token-2002", ltuid_v2: "2002" };
    await settle();
    request.resolve({ retcode: 0, message: "OK", data: null });
    await deletion;

    expect(snackbarSuccess).not.toHaveBeenCalled();
    expect(panel.drafts.value.map((item) => item.id)).toEqual(["draft-new"]);
  });

  it("关闭后重开会发起新请求，旧响应不会覆盖新列表", async () => {
    const oldRequest = deferred<DraftResponse>();
    const newRequest = deferred<DraftResponse>();
    list.mockReset();
    list.mockReturnValueOnce(oldRequest.promise).mockReturnValueOnce(newRequest.promise);
    const panel = mountDraftList();

    panel.visible.value = true;
    await settle();
    expect(list).toHaveBeenCalledTimes(1);
    panel.visible.value = false;
    await settle();
    panel.visible.value = true;
    await settle();
    expect(list).toHaveBeenCalledTimes(2);

    newRequest.resolve(listResponse(createDraft("draft-new", "新请求草稿")));
    await settle();
    oldRequest.resolve(listResponse(createDraft("draft-old", "旧请求草稿")));
    await settle();

    expect(panel.drafts.value.map((item) => item.id)).toEqual(["draft-new"]);
  });

  it("账号切换后旧账号响应不会写入当前草稿列表", async () => {
    const oldRequest = deferred<DraftResponse>();
    const newRequest = deferred<DraftResponse>();
    list.mockReset();
    list.mockReturnValueOnce(oldRequest.promise).mockReturnValueOnce(newRequest.promise);
    const panel = mountDraftList();

    panel.visible.value = true;
    await settle();
    account.uid.value = "2002";
    account.cookie.value = { ltoken_v2: "token-2002", ltuid_v2: "2002" };
    await settle();
    expect(list).toHaveBeenCalledTimes(2);

    newRequest.resolve(listResponse(createDraft("draft-new", "新账号草稿")));
    await settle();
    oldRequest.resolve(listResponse(createDraft("draft-old", "旧账号草稿")));
    await settle();

    expect(panel.drafts.value.map((item) => item.subject)).toEqual(["新账号草稿"]);
    expect(list.mock.calls[1][0]).toEqual({ ltoken_v2: "token-2002", ltuid_v2: "2002" });
  });

  it("切换帖子类型后旧响应不会写入另一类型的列表", async () => {
    const longPostRequest = deferred<DraftResponse>();
    const picturePostRequest = deferred<DraftResponse>();
    list.mockReset();
    list
      .mockReturnValueOnce(longPostRequest.promise)
      .mockReturnValueOnce(picturePostRequest.promise);
    const panel = mountDraftList();

    panel.visible.value = true;
    await settle();
    panel.viewType.value = 2;
    await settle();
    expect(list).toHaveBeenCalledTimes(2);
    expect(list.mock.calls[1][3]).toBe(2);

    picturePostRequest.resolve(listResponse(createDraft("picture-draft", "图片草稿")));
    await settle();
    longPostRequest.resolve(listResponse(createDraft("long-draft", "长文草稿")));
    await settle();

    expect(panel.drafts.value.map((item) => item.id)).toEqual(["picture-draft"]);
  });
});
