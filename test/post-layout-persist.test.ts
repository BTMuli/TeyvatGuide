/**
 * 帖子列表布局持久化回归测试
 * @since Beta v0.14.1
 */

import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mem = vi.hoisted(() => {
  const map = new Map<string, string>();
  const storage = {
    getItem: (key: string): string | null => map.get(key) ?? null,
    setItem: (key: string, value: string): void => {
      map.set(key, String(value));
    },
    removeItem: (key: string): void => {
      map.delete(key);
    },
    clear: (): void => {
      map.clear();
    },
    key: (index: number): string | null => Array.from(map.keys())[index] ?? null,
    get length(): number {
      return map.size;
    },
  };
  return { map, storage };
});

vi.stubGlobal("window", { localStorage: mem.storage });

vi.mock("@tauri-apps/api", () => ({
  path: {
    sep: () => "/",
    appLocalDataDir: async () => "",
    appConfigDir: async () => "",
    appLogDir: async () => "",
  },
}));

vi.mock("@utils/common/toolFunc.js", () => ({
  getInitDeviceInfo: () => ({ device_id: "test" }),
}));

const { createApp } = await import("vue");
const { createPinia, disposePinia, setActivePinia, storeToRefs } = await import("pinia");
const { createPersistedState } = await import("pinia-plugin-persistedstate");
const { default: useAppStore } = await import("../src/store/modules/app.js");
const { postLayout } = await import("../src/utils/bbs/postLayout.js");

const pinias: Array<ReturnType<typeof createPinia>> = [];

/**
 * 模拟一个新窗口，使用共享 localStorage 创建独立的 app store。
 * @since Beta v0.14.1
 * @returns 新窗口的 app store
 */
function openWindow(): ReturnType<typeof useAppStore> {
  const pinia = createPinia();
  pinias.push(pinia);
  pinia.use(createPersistedState());
  createApp({}).use(pinia);
  setActivePinia(pinia);
  return useAppStore();
}

/**
 * 等待持久化插件写入 localStorage。
 * @since Beta v0.14.1
 * @returns 无返回值
 */
async function flush(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

/**
 * 读取 app store 的持久化数据。
 * @since Beta v0.14.1
 * @returns 持久化的 app 状态
 */
function stored(): Record<string, unknown> {
  const raw = mem.storage.getItem("app");
  return raw === null ? {} : <Record<string, unknown>>JSON.parse(raw);
}

describe("帖子列表布局持久化", () => {
  beforeEach(() => {
    for (const pinia of pinias) disposePinia(pinia);
    pinias.length = 0;
    mem.storage.clear();
  });

  afterEach(() => {
    for (const pinia of pinias) disposePinia(pinia);
    pinias.length = 0;
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it("旧的独立布局字段不再影响统一布局", () => {
    mem.storage.setItem("app", JSON.stringify({ postGridMode: false, postWaterfall: true }));

    const store = openWindow();

    expect(store.postLayoutMode).toBe(postLayout.GRID);
    expect(store.postGridMode).toBe(true);
  });

  it("持久化统一布局并保留网格/列表兼容字段", async () => {
    const store = openWindow();
    store.postLayoutMode = postLayout.WATERFALL;
    await flush();

    expect(stored().postLayoutMode).toBe(postLayout.WATERFALL);
    expect(stored().postGridMode).toBeUndefined();
    expect(stored().postWaterfall).toBeUndefined();

    const restarted = openWindow();
    expect(restarted.postLayoutMode).toBe(postLayout.WATERFALL);

    restarted.postGridMode = false;
    await flush();
    expect(restarted.postLayoutMode).toBe(postLayout.LIST);
    expect(stored().postLayoutMode).toBe(postLayout.LIST);

    const { postGridMode } = storeToRefs(restarted);
    postGridMode.value = true;
    await flush();
    expect(restarted.postLayoutMode).toBe(postLayout.GRID);
  });

  it("初始化应用状态时重置为网格布局", async () => {
    const store = openWindow();
    store.postLayoutMode = postLayout.WATERFALL;
    store.init();
    await flush();

    expect(store.postLayoutMode).toBe(postLayout.GRID);
    expect(stored().postLayoutMode).toBe(postLayout.GRID);
  });
});
