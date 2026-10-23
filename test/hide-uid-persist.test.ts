/**
 * 隐藏 UID 的跨窗口持久化回归测试
 * @since Beta v0.13.0
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

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
const { createPinia, setActivePinia } = await import("pinia");
const { createPersistedState } = await import("pinia-plugin-persistedstate");
const { default: useAppStore } = await import("../src/store/modules/app.js");

/**
 * 模拟一个新窗口：独立 pinia 实例，共享同一份 localStorage
 * @since Beta v0.13.0
 * @returns 该窗口的 app store
 */
function openWindow(): ReturnType<typeof useAppStore> {
  const pinia = createPinia();
  pinia.use(createPersistedState());
  // pinia 的插件要等 app.use(pinia) 才真正注册，这里用空 app 走完安装流程
  createApp({}).use(pinia);
  setActivePinia(pinia);
  return useAppStore();
}

/**
 * 等待持久化写入落地（插件按 pre flush 异步落盘）
 * @since Beta v0.13.0
 * @returns 无返回值
 */
async function flush(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

/**
 * 读取落地到存储的 app 状态
 * @since Beta v0.13.0
 * @returns 解析后的持久化对象
 */
function stored(): { hideUid?: boolean; postViewWide?: boolean } {
  const raw = mem.storage.getItem("app");
  return raw === null ? {} : JSON.parse(raw);
}

describe("隐藏 UID 的跨窗口持久化", () => {
  beforeEach(() => {
    mem.storage.clear();
  });

  it("旧窗口未同步时会用过期值覆盖 hideUid", async () => {
    const main = openWindow();
    const old = openWindow();
    main.setHideUid(true);
    await flush();
    expect(stored().hideUid).toBe(true);

    old.postViewWide = false;
    await flush();
    expect(stored().hideUid).toBe(false);
  });

  it("旧窗口收到同步后不会再覆盖，重启后保持最后一次选择", async () => {
    const main = openWindow();
    const old = openWindow();

    main.setHideUid(true);
    old.setHideUid(true);
    await flush();

    old.postViewWide = false;
    await flush();
    expect(stored().hideUid).toBe(true);
    expect(stored().postViewWide).toBe(false);

    const restarted = openWindow();
    expect(restarted.hideUid).toBe(true);
  });

  it("关闭隐藏后同样保持", async () => {
    const main = openWindow();
    const old = openWindow();

    main.setHideUid(true);
    old.setHideUid(true);
    await flush();
    main.setHideUid(false);
    old.setHideUid(false);
    await flush();

    old.postViewWide = true;
    await flush();
    expect(stored().hideUid).toBe(false);

    expect(openWindow().hideUid).toBe(false);
  });
});
