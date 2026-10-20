/**
 * 米游社用户主页导航
 * @since Beta v0.12.6
 */

import { emit } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { computed, ref, shallowRef } from "vue";

import router from "@/router/index.js";

const profileTrail = shallowRef<ReadonlyArray<string>>([]);
const profileTrailIndex = ref<number>(-1);
const hasPreviousProfile = computed<boolean>(() => profileTrailIndex.value > 0);
const hasNextProfile = computed<boolean>(
  () => profileTrailIndex.value < profileTrail.value.length - 1,
);

/**
 * 记录一次用户主页访问；回到访问记录中的当前用户时不新增记录。
 * @since Beta v0.12.6
 * @param userId - 米游社用户 ID
 */
function recordProfileVisit(userId: string): void {
  if (!/^[1-9]\d*$/.test(userId) || profileTrail.value[profileTrailIndex.value] === userId) return;
  profileTrail.value = [...profileTrail.value.slice(0, profileTrailIndex.value + 1), userId];
  profileTrailIndex.value = profileTrail.value.length - 1;
}

/**
 * 在用户主页访问记录中前进或后退一步。
 * @since Beta v0.12.6
 * @param step - -1 为上一个主页，1 为下一个主页
 * @returns 目标用户 ID，不存在时返回 undefined
 */
function stepProfileTrail(step: -1 | 1): string | undefined {
  const targetUid = profileTrail.value[profileTrailIndex.value + step];
  if (targetUid !== undefined) profileTrailIndex.value += step;
  return targetUid;
}

/**
 * 打开米游社用户主页。
 * @since Beta v0.12.6
 * @param userId - 米游社用户 ID
 * @returns 导航完成后的 Promise
 */
async function openCommunityProfile(userId: string): Promise<void> {
  const normalizedUid = userId.trim();
  if (!/^[1-9]\d*$/.test(normalizedUid)) return;

  if (getCurrentWindow().label === "TeyvatGuide") {
    await router.push({ name: "用户信息", params: { uid: normalizedUid } });
    return;
  }
  await emit("active_deep_link", `router?path=/community/profile/${normalizedUid}`);
}

/**
 * 判断帖子标题或摘要是否包含关键词（忽略大小写）。
 * @since Beta v0.12.6
 * @param post - 帖子数据
 * @param keyword - 已去除首尾空白的关键词
 * @returns 是否匹配
 */
function matchesPostKeyword(post: TGApp.BBS.Post.FullData, keyword: string): boolean {
  const needle = keyword.toLowerCase();
  return [post.post.subject, post.post.content].some((text) => text.toLowerCase().includes(needle));
}

export {
  hasNextProfile,
  hasPreviousProfile,
  matchesPostKeyword,
  openCommunityProfile,
  recordProfileVisit,
  stepProfileTrail,
};
