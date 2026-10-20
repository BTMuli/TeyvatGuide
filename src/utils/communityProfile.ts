/**
 * 米游社用户主页导航
 * @since Beta v0.12.6
 */

import { emit } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";

import router from "@/router/index.js";

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

export { matchesPostKeyword, openCommunityProfile };
