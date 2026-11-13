/**
 * 社区个人中心帖子列表的共享类型。
 * @since Beta v0.13.1
 */

declare namespace TGApp.BBS.Profile {
  /**
   * 社区个人中心帖子分页响应。
   * @since Beta v0.13.1
   */
  type PostPage = {
    /** 帖子列表 */
    list: Array<TGApp.BBS.Post.FullData>;
    /** 是否已经加载最后一页 */
    isLast: boolean;
    /** 下一页分页游标 */
    nextOffset: string;
    /** 搜索结果总数 */
    total: number;
  };

  /**
   * 帖子列表控制器的请求依赖。
   * @since Beta v0.13.1
   * @typeParam TSnapshot - 账号与目标用户快照类型
   */
  type PostsControllerOptions<TSnapshot> = {
    /** 获取当前账号和目标用户快照 */
    getSnapshot: () => TSnapshot | undefined;
    /** 判断快照是否仍对应当前页面 */
    isCurrentSnapshot: (snapshot: TSnapshot) => boolean;
    /** 请求一页帖子 */
    fetchPage: (snapshot: TSnapshot, keyword: string, offset?: string) => Promise<PostPage>;
    /** 将请求异常转换为展示文案 */
    getErrorMessage?: (cause: unknown) => string;
  };

  /**
   * 帖子列表控制器的响应式状态与操作。
   * @since Beta v0.13.1
   * @typeParam TSnapshot - 账号与目标用户快照类型
   */
  type PostsController<TSnapshot> = {
    /** 当前帖子列表 */
    posts: import("vue").ShallowRef<Array<TGApp.BBS.Post.FullData>>;
    /** 下一页分页游标 */
    nextOffset: import("vue").Ref<string>;
    /** 是否已经加载最后一页 */
    isLast: import("vue").Ref<boolean>;
    /** 是否正在加载首屏 */
    loading: import("vue").Ref<boolean>;
    /** 是否正在加载下一页 */
    loadingMore: import("vue").Ref<boolean>;
    /** 下一页错误文案 */
    loadMoreError: import("vue").Ref<string>;
    /** 首屏错误文案 */
    loadError: import("vue").Ref<string>;
    /** 当前搜索关键词 */
    searchKeyword: import("vue").Ref<string>;
    /** 搜索结果总数 */
    searchTotal: import("vue").Ref<number>;
    /** 重置帖子状态 */
    reset: () => void;
    /** 加载首屏帖子 */
    loadInitial: () => Promise<void>;
    /** 使用关键词重新搜索 */
    search: (input: string | null) => Promise<void>;
    /** 加载下一页帖子 */
    loadMore: () => Promise<void>;
    /** 判断请求版本和快照是否仍然有效 */
    isCurrent: (version: number, snapshot: TSnapshot) => boolean;
    /** 获取当前请求版本 */
    getVersion: () => number;
    /** 结束控制器生命周期 */
    dispose: () => void;
  };
}
