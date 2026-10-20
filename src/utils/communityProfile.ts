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

export { openCommunityProfile };
