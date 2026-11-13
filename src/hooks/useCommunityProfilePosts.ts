/**
 * 社区个人中心帖子分页状态辅助函数。
 * @since Beta v0.13.1
 */

import { ref, shallowRef } from "vue";

/**
 * 合并一页帖子并检查分页游标。
 * @since Beta v0.13.1
 * @param current - 当前已展示的帖子
 * @param page - 待合并的分页响应
 * @param offset - 本次请求使用的分页游标
 * @returns 去除重复帖子的列表
 */
function appendCommunityPostPage(
  current: Array<TGApp.BBS.Post.FullData>,
  page: TGApp.BBS.Profile.PostPage,
  offset: string = "",
): Array<TGApp.BBS.Post.FullData> {
  if (!page.isLast && page.nextOffset.trim() === "") {
    throw new Error("帖子分页游标无效");
  }
  if (offset !== "" && !page.isLast && page.nextOffset === offset) {
    throw new Error("帖子分页游标无效，请刷新后重试。");
  }

  const ids = new Set(current.map((post) => post.post.post_id));
  return [
    ...current,
    ...page.list.filter((post) => {
      if (ids.has(post.post.post_id)) return false;
      ids.add(post.post.post_id);
      return true;
    }),
  ];
}

/**
 * 创建个人中心帖子列表的请求与分页控制器。
 * @since Beta v0.13.1
 * @typeParam TSnapshot - 账号与目标用户快照类型
 * @param options - 请求、快照和错误转换函数
 * @returns 帖子列表控制器
 */
function createCommunityProfilePostsController<TSnapshot>(
  options: TGApp.BBS.Profile.PostsControllerOptions<TSnapshot>,
): TGApp.BBS.Profile.PostsController<TSnapshot> {
  const posts = shallowRef<Array<TGApp.BBS.Post.FullData>>([]);
  const nextOffset = ref<string>("");
  const isLast = ref<boolean>(false);
  const loading = ref<boolean>(false);
  const loadingMore = ref<boolean>(false);
  const loadMoreError = ref<string>("");
  const loadError = ref<string>("");
  const searchKeyword = ref<string>("");
  const searchTotal = ref<number>(0);
  let requestVersion = 0;
  let active = true;

  /**
   * 重置帖子列表状态并使当前请求失效。
   * @since Beta v0.13.1
   */
  function reset(): void {
    requestVersion += 1;
    posts.value = [];
    nextOffset.value = "";
    isLast.value = false;
    loading.value = false;
    loadingMore.value = false;
    loadMoreError.value = "";
    loadError.value = "";
    searchKeyword.value = "";
    searchTotal.value = 0;
  }

  /**
   * 加载帖子首屏。
   * @since Beta v0.13.1
   */
  async function loadInitial(): Promise<void> {
    const snapshot = options.getSnapshot();
    if (snapshot === undefined) return;
    const version = ++requestVersion;
    loading.value = true;
    loadError.value = "";
    try {
      const page = await options.fetchPage(snapshot, "");
      if (!isCurrentRequest(version, snapshot)) return;
      posts.value = appendCommunityPostPage([], page);
      nextOffset.value = page.nextOffset;
      isLast.value = page.isLast;
      searchTotal.value = page.total;
    } catch (cause) {
      if (isCurrentRequest(version, snapshot)) loadError.value = getErrorMessage(cause);
    } finally {
      if (isCurrentRequest(version, snapshot)) loading.value = false;
    }
  }

  /**
   * 按关键词重新加载帖子。
   * @since Beta v0.13.1
   * @param input - 搜索关键词
   */
  async function search(input: string | null): Promise<void> {
    const snapshot = options.getSnapshot();
    if (snapshot === undefined || loading.value) return;
    const version = ++requestVersion;
    searchKeyword.value = (input ?? "").trim();
    posts.value = [];
    nextOffset.value = "";
    isLast.value = false;
    loadingMore.value = false;
    loadMoreError.value = "";
    loadError.value = "";
    searchTotal.value = 0;
    loading.value = true;
    try {
      const page = await options.fetchPage(snapshot, searchKeyword.value);
      if (!isCurrentRequest(version, snapshot)) return;
      posts.value = appendCommunityPostPage([], page);
      nextOffset.value = page.nextOffset;
      isLast.value = page.isLast;
      searchTotal.value = page.total;
    } catch (cause) {
      if (isCurrentRequest(version, snapshot)) loadError.value = getErrorMessage(cause);
    } finally {
      if (isCurrentRequest(version, snapshot)) loading.value = false;
    }
  }

  /**
   * 加载帖子下一页。
   * @since Beta v0.13.1
   */
  async function loadMore(): Promise<void> {
    if (loading.value || loadingMore.value || isLast.value) return;
    const snapshot = options.getSnapshot();
    const offset = nextOffset.value.trim();
    if (snapshot === undefined || offset === "") return;
    const version = requestVersion;
    loadingMore.value = true;
    loadMoreError.value = "";
    try {
      const page = await options.fetchPage(snapshot, searchKeyword.value, offset);
      if (!isCurrentRequest(version, snapshot)) return;
      posts.value = appendCommunityPostPage(posts.value, page, offset);
      nextOffset.value = page.nextOffset;
      isLast.value = page.isLast;
    } catch (cause) {
      if (isCurrentRequest(version, snapshot)) loadMoreError.value = getErrorMessage(cause);
    } finally {
      if (isCurrentRequest(version, snapshot)) loadingMore.value = false;
    }
  }

  /**
   * 判断请求是否仍对应当前控制器状态。
   * @since Beta v0.13.1
   * @param version - 请求版本
   * @param snapshot - 请求快照
   * @returns 请求是否仍然有效
   */
  function isCurrentRequest(version: number, snapshot: TSnapshot): boolean {
    return active && version === requestVersion && options.isCurrentSnapshot(snapshot);
  }

  /**
   * 对外判断请求是否仍然有效。
   * @since Beta v0.13.1
   * @param version - 请求版本
   * @param snapshot - 请求快照
   * @returns 请求是否仍然有效
   */
  function isCurrent(version: number, snapshot: TSnapshot): boolean {
    return isCurrentRequest(version, snapshot);
  }

  /**
   * 读取当前请求版本。
   * @since Beta v0.13.1
   * @returns 当前请求版本
   */
  function getVersion(): number {
    return requestVersion;
  }

  /**
   * 转换请求异常为可展示文案。
   * @since Beta v0.13.1
   * @param cause - 请求异常
   * @returns 错误文案
   */
  function getErrorMessage(cause: unknown): string {
    return (
      options.getErrorMessage?.(cause) ?? (cause instanceof Error ? cause.message : String(cause))
    );
  }

  /**
   * 结束控制器生命周期并使请求失效。
   * @since Beta v0.13.1
   */
  function dispose(): void {
    active = false;
    requestVersion += 1;
  }

  return {
    posts,
    nextOffset,
    isLast,
    loading,
    loadingMore,
    loadMoreError,
    loadError,
    searchKeyword,
    searchTotal,
    reset,
    loadInitial,
    search,
    loadMore,
    isCurrent,
    getVersion,
    dispose,
  };
}

export { appendCommunityPostPage, createCommunityProfilePostsController };
