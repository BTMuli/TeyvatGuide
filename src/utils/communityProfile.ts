/**
 * 米游社用户主页导航
 * @since Beta v0.13.0
 */

import bbsEnum from "@enum/bbs.js";
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
 * @since Beta v0.13.0
 * @param userId - 米游社用户 ID
 */
function recordProfileVisit(userId: string): void {
  if (!/^[1-9]\d*$/.test(userId) || profileTrail.value[profileTrailIndex.value] === userId) return;
  profileTrail.value = [...profileTrail.value.slice(0, profileTrailIndex.value + 1), userId];
  profileTrailIndex.value = profileTrail.value.length - 1;
}

/**
 * 在用户主页访问记录中前进或后退一步。
 * @since Beta v0.13.0
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
 * @since Beta v0.13.0
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
 * @since Beta v0.13.0
 * @param post - 帖子数据
 * @param keyword - 已去除首尾空白的关键词
 * @returns 是否匹配
 */
function matchesPostKeyword(post: TGApp.BBS.Post.FullData, keyword: string): boolean {
  const needle = keyword.toLowerCase();
  return [post.post.subject, post.post.content].some((text) => text.toLowerCase().includes(needle));
}

/**
 * 获取帖子类型的展示名称。
 * @since Beta v0.13.0
 * @param post - 帖子数据
 * @returns 帖子类型名称，未知类型返回 undefined
 */
function getPostTypeLabel(post: TGApp.BBS.Post.FullData): string | undefined {
  switch (post.post.view_type) {
    case bbsEnum.post.viewType.NORMAL:
      return "长文";
    case bbsEnum.post.viewType.PIC:
      return "图文";
    case bbsEnum.post.viewType.VOD:
      return "视频";
    default:
      return undefined;
  }
}

/**
 * 获取帖子类型对应的图标。
 * @since Beta v0.13.0
 * @param post - 帖子数据
 * @returns 帖子类型图标，未知类型返回 undefined
 */
function getPostTypeIcon(post: TGApp.BBS.Post.FullData): string | undefined {
  switch (post.post.view_type) {
    case bbsEnum.post.viewType.NORMAL:
      return "mdi-text-box-outline";
    case bbsEnum.post.viewType.PIC:
      return "mdi-image-outline";
    case bbsEnum.post.viewType.VOD:
      return "mdi-video-outline";
    default:
      return undefined;
  }
}

/**
 * 获取帖子版块的图标，优先使用版块列表中的纯图标。
 * @since Beta v0.13.0
 * @param post - 帖子数据
 * @param forumList - 分区版块列表
 * @returns 版块图标，缺失时返回 undefined
 */
function getPostForumIcon(
  post: TGApp.BBS.Post.FullData,
  forumList: Array<TGApp.BBS.Forum.GameForum>,
): string | undefined {
  const game = forumList.find((item) => item.game_id === post.post.game_id);
  const forum = game?.forums.find((item) => item.id === post.forum?.id);
  return forum?.icon_pure || post.forum?.icon;
}

/**
 * 获取帖子卡片展示的预览图，最多 3 张。
 * @since Beta v0.13.0
 * @param post - 帖子数据
 * @returns 预览图地址列表
 */
function getPostPreviewImages(post: TGApp.BBS.Post.FullData): Array<string> {
  if (post.post.images.length) return post.post.images.slice(0, 3);
  const cover = post.cover?.url || post.post.cover;
  return cover ? [cover] : [];
}

/**
 * 获取帖子的图片总数。
 * @since Beta v0.13.0
 * @param post - 帖子数据
 * @returns 图片总数
 */
function getPostImageCount(post: TGApp.BBS.Post.FullData): number {
  if (post.post.images.length) return post.post.images.length;
  return post.cover?.url || post.post.cover ? 1 : 0;
}

export {
  getPostForumIcon,
  getPostImageCount,
  getPostPreviewImages,
  getPostTypeIcon,
  getPostTypeLabel,
  hasNextProfile,
  hasPreviousProfile,
  matchesPostKeyword,
  openCommunityProfile,
  recordProfileVisit,
  stepProfileTrail,
};
