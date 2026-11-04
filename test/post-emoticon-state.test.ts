/**
 * 帖子预览表情目录状态回归测试。
 * @since Beta v0.13.0
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computed, ref } from "vue";

import { splitPostEmoticonText } from "../src/utils/bbs/postEmoticon.js";

const mocks = vi.hoisted(() => ({ emojis: vi.fn() }));

vi.mock("@req/bbsReq.js", () => ({ default: { emojis: mocks.emojis } }));

const smileUrl = "https://example.com/emoticons/smile.png";
const newUrl = "https://example.com/emoticons/new.png";

/** 安装独立的内存表情缓存。 @since Beta v0.13.0 */
function installStorage(value: string | null): void {
  const values = new Map<string, string>();
  if (value !== null) values.set("emojis", value);
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, next: string) => values.set(key, next),
    removeItem: (key: string) => values.delete(key),
    clear: () => values.clear(),
    key: (index: number) => [...values.keys()][index] ?? null,
    get length() {
      return values.size;
    },
  });
}

/** 为每个用例创建独立的共享目录状态。 @since Beta v0.13.0 */
async function loadStateModule(): Promise<typeof import("../src/hooks/usePostEmoticons.js")> {
  vi.resetModules();
  return import("../src/hooks/usePostEmoticons.js");
}

beforeEach(() => {
  mocks.emojis.mockReset();
  installStorage(null);
});
afterEach(() => vi.unstubAllGlobals());

describe("usePostEmoticons", () => {
  it("补齐旧缓存中的缺失表情，并合并并发目录请求", async () => {
    installStorage(JSON.stringify({ smile: smileUrl }));
    let resolveRequest: (value: unknown) => void = () => undefined;
    mocks.emojis.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );
    const { usePostEmoticons } = await loadStateModule();
    const first = usePostEmoticons();
    const second = usePostEmoticons();

    expect(splitPostEmoticonText("_(new)", first.emoticonMap.value)[0]?.insert).toBe("_(new)");
    const firstLoad = first.ensureEmoticons(["new"]);
    const secondLoad = second.ensureEmoticons(["new"]);
    expect(mocks.emojis).toHaveBeenCalledTimes(1);

    resolveRequest({
      retcode: 0,
      data: { list: [{ list: [{ name: "new", icon: newUrl }] }] },
    });
    await Promise.all([firstLoad, secondLoad]);

    expect(splitPostEmoticonText("_(new)", first.emoticonMap.value)[0]?.insert).toEqual({
      emoticon: { name: "new", src: newUrl },
    });
    expect(JSON.parse(localStorage.getItem("emojis") ?? "{}")).toEqual({
      smile: smileUrl,
      new: newUrl,
    });
  });

  it("安全处理非法缓存，并在目录请求失败时避免同一次观察周期重复请求", async () => {
    installStorage("not-json");
    mocks.emojis.mockRejectedValue(new Error("offline"));
    const { usePostEmoticons } = await loadStateModule();
    const state = usePostEmoticons();

    expect(state.emoticonMap.value).toEqual({});
    await Promise.all([state.ensureEmoticons(["new"]), state.ensureEmoticons(["new"])]);
    expect(mocks.emojis).toHaveBeenCalledTimes(1);
  });

  it("recovers on a later request after a network failure", async () => {
    mocks.emojis.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({
      retcode: 0,
      data: { list: [{ list: [{ name: "new", icon: newUrl }] }] },
    });
    const { usePostEmoticons } = await loadStateModule();
    const state = usePostEmoticons();
    await state.ensureEmoticons(["new"]);
    expect(state.emoticonMap.value.new).toBeUndefined();
    await state.ensureEmoticons(["new"]);
    expect(state.emoticonMap.value.new).toBe(newUrl);
    await state.ensureEmoticons(["unknown"]);
    expect(mocks.emojis).toHaveBeenCalledTimes(2);
  });

  it("updates text segments when the directory or source text changes", async () => {
    mocks.emojis.mockResolvedValue({
      retcode: 0,
      data: { list: [{ list: [{ name: "new", icon: newUrl }] }] },
    });
    const { usePostEmoticons } = await loadStateModule();
    const state = usePostEmoticons();
    const text = ref<string>("前_(new)后");
    const segments = computed<ReturnType<typeof splitPostEmoticonText>>(() =>
      splitPostEmoticonText(text.value, state.emoticonMap.value),
    );
    expect(segments.value.map((segment) => segment.insert)).toEqual(["前_(new)后"]);
    await state.ensureEmoticons(["new"]);
    expect(segments.value.map((segment) => segment.insert)).toEqual([
      "前",
      { emoticon: { name: "new", src: newUrl } },
      "后",
    ]);
    text.value = "普通文字";
    expect(segments.value.map((segment) => segment.insert)).toEqual(["普通文字"]);
  });

  it("uses known cached tokens without requesting a directory", async () => {
    installStorage(JSON.stringify({ smile: smileUrl }));
    const { usePostEmoticons, getPostEmoticonNames } = await loadStateModule();
    const state = usePostEmoticons();
    await state.ensureEmoticons(["smile"]);
    await state.ensureEmoticons([]);
    expect(mocks.emojis).not.toHaveBeenCalled();
    expect(getPostEmoticonNames("_(smile)_(smile)_( invalid )_(new)")).toEqual(["smile", "new"]);
  });
});
