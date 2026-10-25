/**
 * 祈愿记录布局设置持久化回归测试
 * @since Beta v0.13.0
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

const pinias: Array<ReturnType<typeof createPinia>> = [];

/**
 * 模拟一个新窗口，使用共享 localStorage 创建独立的 app store。
 * @since Beta v0.13.0
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
 * @since Beta v0.13.0
 * @returns 无返回值
 */
async function flush(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

/**
 * 读取 app store 的持久化数据。
 * @since Beta v0.13.0
 * @returns 持久化的 app 状态
 */
function stored(): { gachaGridMode?: boolean } {
  const raw = mem.storage.getItem("app");
  return raw === null ? {} : JSON.parse(raw);
}

describe("祈愿记录布局设置持久化", () => {
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

  it("缺少设置时默认列表，并在同一窗口的卡池之间共享布局", async () => {
    mem.storage.setItem("app", JSON.stringify({ postGridMode: true }));
    const main = openWindow();
    const sibling = useAppStore();
    const mainLayout = storeToRefs(main).gachaGridMode;
    const siblingLayout = storeToRefs(sibling).gachaGridMode;

    expect(mainLayout.value).toBe(false);
    mainLayout.value = true;
    expect(siblingLayout.value).toBe(true);
    await flush();
    expect(stored().gachaGridMode).toBe(true);

    const restarted = openWindow();
    expect(restarted.gachaGridMode).toBe(true);
    restarted.gachaGridMode = false;
    await flush();
    expect(stored().gachaGridMode).toBe(false);
    expect(openWindow().gachaGridMode).toBe(false);
  });

  it("初始化应用状态时重置布局设置并持久化列表布局", async () => {
    const store = openWindow();
    store.gachaGridMode = true;
    await flush();
    store.init();
    await flush();

    expect(store.gachaGridMode).toBe(false);
    expect(stored().gachaGridMode).toBe(false);
  });
});
