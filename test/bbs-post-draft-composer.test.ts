/**
 * 米游社帖子编辑器云草稿加载与保存回归测试。
 * @since Beta v0.13.2
 */

import { readFileSync } from "node:fs";

import ts from "typescript";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as Vue from "vue";
import { compileScript, parse } from "vue/compiler-sfc";

type HostNode = {
  parent: HostNode | null;
  children: Array<HostNode>;
  text: string;
};

/** 编辑器真实草稿状态与操作。 @since Beta v0.13.1 */
type ComposerBindings = {
  draft: Vue.Ref<TGApp.BBS.PostEdit.Settings>;
  canSubmit: Vue.ComputedRef<boolean>;
  hasChanges: Vue.ComputedRef<boolean>;
  currentDraftId: Vue.ComputedRef<string | undefined>;
  canDeleteDraft: Vue.ComputedRef<boolean>;
  draftDeletePending: Vue.Ref<boolean>;
  deleteDraft: () => Promise<void>;
  saveDraft: () => Promise<void>;
  forgetDraft: (id: string) => void;
};

type CompiledComposer = {
  default: {
    setup: (props: Record<string, unknown>, context: Vue.SetupContext) => ComposerBindings;
  };
};

const source = readFileSync(
  new URL("../src/components/viewPost/vp-post-composer.vue", import.meta.url),
  "utf8",
);
const script = compileScript(parse(source).descriptor, { id: "post-draft-composer-regression" });
const compiled = ts.transpileModule(script.content, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

const postDraftReq = {
  detail: vi.fn(),
  save: vi.fn(),
  delete: vi.fn(),
};
const dialogCheck = vi.fn();
const snackbarSuccess = vi.fn();
const snackbarError = vi.fn();
const snackbarWarn = vi.fn();
const account = {
  uid: Vue.ref<string>("1001"),
  cookie: Vue.ref({
    account_id: "1001",
    cookie_token: "cookie-1001",
    ltoken: "token-1001",
    ltuid: "1001",
    mid: "mid-1001",
    stoken: "stoken-1001",
    stuid: "1001",
  }),
  briefInfo: Vue.ref({ nickname: "旅行者" }),
};
const bbsStore = {
  forumList: Vue.ref([
    {
      game_id: 2,
      forums: [{ id: 10, name: "测试版块", view_type: 1, forum_cate_list: [] }],
    },
  ]),
  gameList: Vue.ref([{ id: 2, app_icon: "" }]),
  refreshForumList: vi.fn(),
};
const dispose: Array<() => void> = [];

/**
 * 创建帖子草稿设置。
 * @since Beta v0.13.1
 * @param subject - 帖子标题
 * @returns 可供编辑器加载的草稿设置
 */
function createSettings(subject: string): TGApp.BBS.PostEdit.Settings {
  return {
    gid: 2,
    forumId: 10,
    subject,
    nodes: [{ insert: "草稿正文\n" }],
    viewType: 1,
    topicIds: [],
    cateId: 0,
    isOriginal: 0,
    republishAuthorization: 0,
    cover: "",
    userAiContentChoice: "USER_AI_CONTENT_CHOICE_UNKNOWN",
  };
}

/**
 * 创建云草稿详情响应。
 * @since Beta v0.13.1
 * @param subject - 帖子标题
 * @param id - 草稿 ID
 * @returns 模拟详情响应
 */
function detailResponse(subject: string, id: string = "draft-1") {
  return {
    retcode: 0,
    message: "OK",
    data: { id, settings: createSettings(subject), updatedAt: 1 },
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
 * 挂载真实帖子编辑器 setup，仅替换网络、账号和无关子组件。
 * @since Beta v0.13.1
 * @param draftId - 要加载的草稿 ID，null 表示尚未保存的新草稿
 * @returns 编辑器响应式状态
 */
function mountComposer(draftId: string | null = "draft-1"): ComposerBindings {
  const dependencies: Record<string, unknown> = {
    vue: Vue,
    pinia: { storeToRefs: (store: unknown) => store },
    "@comp/app/t-mi-img.vue": {},
    "@comp/func/dialog.js": { checkF: dialogCheck },
    "@comp/func/snackbar.js": {
      success: snackbarSuccess,
      error: snackbarError,
      warn: snackbarWarn,
    },
    "@req/bbsReq.js": {
      userInfo: vi.fn().mockResolvedValue({ retcode: 1, message: "skip", data: {} }),
    },
    "@req/postDraftReq.js": postDraftReq,
    "@req/postEditReq.js": { getPostEditSettings: vi.fn(), checkRelease: vi.fn() },
    "@req/postReq.js": { post: vi.fn() },
    "@req/postVoteReq.js": { create: vi.fn() },
    "@req/topicReq.js": {
      info: vi.fn(),
      recommend: vi.fn().mockResolvedValue({ retcode: 0, message: "OK", data: { topics: [] } }),
      search: vi.fn(),
    },
    "@store/bbs.js": () => bbsStore,
    "@store/user.js": () => account,
    "@utils/bbs/postDocument.js": {
      assertPostDocumentContent: vi.fn(),
      buildPostDocument: (nodes: unknown) => ({ nodes, text: "草稿正文", images: [] }),
    },
    "@utils/bbs/postPicture.js": {
      assertPicturePostDocument: vi.fn(),
      buildPicturePostDocument: vi.fn(() => ({ nodes: [], text: "", images: [], length: 0 })),
    },
    "@utils/bbs/postPublish.js": { canPublishForumPost: () => true },
    "@utils/bbs/replyAccount.js": {
      executeReplyForCurrentAccount: async (
        snapshot: { uid: string; cookie: { ltuid: string; ltoken: string } },
        action: () => Promise<unknown>,
      ) => {
        if (!matchesCurrentAccount(snapshot)) return { allowed: false };
        return { allowed: true, data: await action() };
      },
      matchesCurrentAccount,
    },
    "@utils/community/profileLevel.js": { getCommunityProfileLevel: vi.fn() },
    "@utils/network/TGHttps.js": {
      getErrMsg: (cause: unknown) => (cause instanceof Error ? cause.message : String(cause)),
    },
    "./vp-picture-uploader.vue": {},
    "./vp-post-collection-picker.vue": {},
    "./vp-post-component-dialog.vue": {},
    "./vp-post-editor.vue": {},
    "./vp-post-preview.vue": {},
    "./vp-post-tools.vue": {},
  };
  const module = { exports: <CompiledComposer>{} };
  new Function("require", "module", "exports", compiled)(
    (id: string) => {
      if (!(id in dependencies)) throw new Error(`未配置的编辑器依赖：${id}`);
      return dependencies[id];
    },
    module,
    module.exports,
  );
  let bindings: ComposerBindings | undefined;
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
      bindings = module.exports.default.setup(
        {
          formId: "post-form",
          gid: 2,
          draftId: draftId ?? undefined,
          viewType: 1,
          forumId: 10,
        },
        context,
      );
      return () => Vue.h("section");
    },
  });
  app.mount(createNode());
  dispose.push(() => app.unmount());
  if (!bindings) throw new Error("编辑器未完成初始化");
  return bindings;
}

/**
 * 等待网络 Promise 与 Vue 更新队列。
 * @since Beta v0.13.1
 */
async function settle(): Promise<void> {
  for (let index = 0; index < 8; index += 1) {
    await Promise.resolve();
    await Vue.nextTick();
  }
}

/**
 * 按测试账号状态校验请求快照。
 * @since Beta v0.13.1
 * @param snapshot - 请求使用的账号快照
 * @returns 快照是否仍对应当前账号
 */
function matchesCurrentAccount(snapshot: {
  uid: string;
  cookie: { ltuid: string; ltoken: string };
}): boolean {
  return (
    snapshot.uid === account.uid.value &&
    snapshot.cookie.ltuid === account.cookie.value.ltuid &&
    snapshot.cookie.ltoken === account.cookie.value.ltoken
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  account.uid.value = "1001";
  account.cookie.value = {
    account_id: "1001",
    cookie_token: "cookie-1001",
    ltoken: "token-1001",
    ltuid: "1001",
    mid: "mid-1001",
    stoken: "stoken-1001",
    stuid: "1001",
  };
  postDraftReq.detail.mockResolvedValue(detailResponse("服务器草稿"));
  postDraftReq.save.mockResolvedValue({ retcode: 0, message: "OK", data: { draft_id: "draft-1" } });
  postDraftReq.delete.mockResolvedValue({ retcode: 0, message: "OK", data: null });
  dialogCheck.mockResolvedValue(false);
});

afterEach(() => {
  for (const unmount of dispose.splice(0)) unmount();
});

describe("帖子编辑器云草稿", () => {
  it("新草稿首次保存后提供可删除的云端 ID", async () => {
    const composer = mountComposer(null);
    await settle();
    expect(composer.currentDraftId.value).toBeUndefined();

    await composer.saveDraft();

    expect(composer.currentDraftId.value).toBe("draft-1");
    expect(composer.canDeleteDraft.value).toBe(true);
  });

  it("删除当前云草稿后保留编辑内容，并允许另存为新草稿", async () => {
    const composer = mountComposer();
    await settle();
    composer.draft.value.subject = "保留在编辑器的内容";
    composer.forgetDraft("draft-1");

    expect(composer.draft.value.subject).toBe("保留在编辑器的内容");
    expect(composer.hasChanges.value).toBe(true);
    await composer.saveDraft();

    expect(postDraftReq.save.mock.calls[0][0].subject).toBe("保留在编辑器的内容");
    expect(postDraftReq.save.mock.calls[0][2]).toBeUndefined();
  });

  it("确认删除当前云草稿后保留编辑内容并清除草稿源", async () => {
    dialogCheck.mockResolvedValue(true);
    const composer = mountComposer();
    await settle();
    composer.draft.value.subject = "删除后仍保留的内容";

    await composer.deleteDraft();

    expect(dialogCheck).toHaveBeenCalledWith({
      cancelLabel: "保留",
      confirmLabel: "删除",
      text: "删除米游社云端草稿后不可撤销，当前编辑内容会保留。",
      title: "删除草稿「删除后仍保留的内容」？",
    });
    expect(postDraftReq.delete).toHaveBeenCalledWith("draft-1", {
      ltoken: "token-1001",
      ltuid: "1001",
    });
    expect(composer.draft.value.subject).toBe("删除后仍保留的内容");
    expect(composer.currentDraftId.value).toBeUndefined();
    expect(composer.canDeleteDraft.value).toBe(false);
    expect(composer.draftDeletePending.value).toBe(false);

    await composer.saveDraft();

    expect(postDraftReq.save.mock.calls[0][2]).toBeUndefined();
    expect(snackbarSuccess).toHaveBeenCalledWith("草稿已删除，编辑内容已保留");
  });

  it("取消删除确认不会调用草稿删除接口", async () => {
    const composer = mountComposer();
    await settle();

    await composer.deleteDraft();

    expect(dialogCheck).toHaveBeenCalled();
    expect(postDraftReq.delete).not.toHaveBeenCalled();
    expect(composer.currentDraftId.value).toBe("draft-1");
    expect(composer.draftDeletePending.value).toBe(false);
  });

  it("删除接口返回业务错误时保留草稿源和编辑内容", async () => {
    dialogCheck.mockResolvedValue(true);
    postDraftReq.delete.mockResolvedValueOnce({ retcode: -1, message: "删除失败", data: null });
    const composer = mountComposer();
    await settle();
    composer.draft.value.subject = "未被删除的编辑内容";

    await composer.deleteDraft();

    expect(composer.draft.value.subject).toBe("未被删除的编辑内容");
    expect(composer.currentDraftId.value).toBe("draft-1");
    expect(composer.canDeleteDraft.value).toBe(true);
    expect(composer.draftDeletePending.value).toBe(false);
    expect(snackbarError).toHaveBeenCalledWith("[-1] 删除失败");
  });

  it("确认等待期间切换账号时不发送旧草稿删除请求", async () => {
    const confirmation = deferred<boolean>();
    dialogCheck.mockReturnValueOnce(confirmation.promise);
    const composer = mountComposer();
    await settle();
    const deletion = composer.deleteDraft();
    await settle();

    account.uid.value = "2002";
    account.cookie.value = {
      account_id: "2002",
      cookie_token: "cookie-2002",
      ltoken: "token-2002",
      ltuid: "2002",
      mid: "mid-2002",
      stoken: "stoken-2002",
      stuid: "2002",
    };
    await settle();
    confirmation.resolve(true);
    await deletion;

    expect(postDraftReq.delete).not.toHaveBeenCalled();
    expect(composer.draftDeletePending.value).toBe(false);
  });

  it("删除请求进行中禁止重复删除", async () => {
    dialogCheck.mockResolvedValue(true);
    const request = deferred<{ retcode: number; message: string; data: unknown }>();
    postDraftReq.delete.mockReturnValueOnce(request.promise);
    const composer = mountComposer();
    await settle();

    const deletion = composer.deleteDraft();
    await settle();
    const duplicate = composer.deleteDraft();
    await duplicate;

    expect(postDraftReq.delete).toHaveBeenCalledTimes(1);
    expect(composer.draftDeletePending.value).toBe(true);
    request.resolve({ retcode: 0, message: "OK", data: null });
    await deletion;
    expect(composer.draftDeletePending.value).toBe(false);
  });

  it("详情未返回分区时使用草稿列表带入的分区", async () => {
    const response = detailResponse("缺少分区的草稿");
    response.data.settings.gid = 0;
    postDraftReq.detail.mockResolvedValueOnce(response);
    const composer = mountComposer();
    await settle();

    expect(composer.draft.value.gid).toBe(2);
    expect(composer.canSubmit.value).toBe(true);
    await composer.saveDraft();
    expect(postDraftReq.save.mock.calls[0][0].gid).toBe(2);
  });

  it("载入草稿详情并保留服务端正文设置", async () => {
    const composer = mountComposer();
    await settle();

    expect(postDraftReq.detail).toHaveBeenCalledWith("draft-1", {
      ltoken: "token-1001",
      ltuid: "1001",
    });
    expect(composer.draft.value.subject).toBe("服务器草稿");
    expect(composer.canSubmit.value).toBe(true);
    expect(composer.hasChanges.value).toBe(false);
  });

  it("保存已有草稿时沿用同一个草稿 ID", async () => {
    const composer = mountComposer();
    await settle();
    expect(composer.hasChanges.value).toBe(false);

    composer.draft.value.subject = "第一次修改";
    expect(composer.hasChanges.value).toBe(true);
    await composer.saveDraft();
    expect(composer.hasChanges.value).toBe(false);

    composer.draft.value.subject = "第二次修改";
    expect(composer.hasChanges.value).toBe(true);
    await composer.saveDraft();
    expect(composer.hasChanges.value).toBe(false);

    expect(postDraftReq.save).toHaveBeenCalledTimes(2);
    expect(postDraftReq.save.mock.calls[0][2]).toEqual(expect.objectContaining({ id: "draft-1" }));
    expect(postDraftReq.save.mock.calls[1][2]).toEqual(expect.objectContaining({ id: "draft-1" }));
    expect(postDraftReq.save.mock.calls[1][0].subject).toBe("第二次修改");
  });

  it("保存失败时保留当前编辑内容", async () => {
    const composer = mountComposer();
    await settle();
    expect(composer.hasChanges.value).toBe(false);

    composer.draft.value.subject = "本地未保存修改";
    expect(composer.hasChanges.value).toBe(true);
    postDraftReq.save.mockRejectedValueOnce(new Error("保存失败"));

    await composer.saveDraft();

    expect(composer.draft.value.subject).toBe("本地未保存修改");
    expect(composer.hasChanges.value).toBe(true);
    expect(snackbarError).toHaveBeenCalledWith("保存失败");
  });

  it("账号切换后旧详情响应不会覆盖新账号草稿", async () => {
    const oldRequest = deferred<ReturnType<typeof detailResponse>>();
    const newRequest = deferred<ReturnType<typeof detailResponse>>();
    postDraftReq.detail.mockReset();
    postDraftReq.detail
      .mockReturnValueOnce(oldRequest.promise)
      .mockReturnValueOnce(newRequest.promise);

    const composer = mountComposer();
    await settle();
    expect(postDraftReq.detail).toHaveBeenCalledTimes(1);

    account.uid.value = "2002";
    account.cookie.value = {
      account_id: "2002",
      cookie_token: "cookie-2002",
      ltoken: "token-2002",
      ltuid: "2002",
      mid: "mid-2002",
      stoken: "stoken-2002",
      stuid: "2002",
    };
    await settle();
    expect(postDraftReq.detail).toHaveBeenCalledTimes(2);

    newRequest.resolve(detailResponse("新账号草稿"));
    await settle();
    oldRequest.resolve(detailResponse("旧账号草稿"));
    await settle();

    expect(composer.draft.value.subject).toBe("新账号草稿");
    expect(postDraftReq.detail.mock.calls[1][1]).toEqual({
      ltoken: "token-2002",
      ltuid: "2002",
    });
  });
});
