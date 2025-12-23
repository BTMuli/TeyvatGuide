/**
 * 观测枢相关请求类型
 * @since Beta v0.7.2
 */
declare namespace TGApp.BBS.Obc {
  /**
   * 卡池返回响应
   * @since Beta v0.7.2
   */
  type GachaResp = TGApp.BBS.Response.BaseWithData<GachaRes>;

  /**
   * 卡池返回数据
   * @since Beta v0.7.2
   */
  type GachaRes = {
    /** 卡池列表 */
    list: Array<GachaItem>;
  };

  /**
   * 卡池信息
   * @since Beta v0.7.2
   * @remarks 时间格式示例：2023-03-21 17:59:59
   */
  type GachaItem = {
    /** 卡池 ID */
    id: number;
    /** 卡池标题 */
    title: string;
    /** 卡池对应帖子 */
    activity_url: string;
    /** 卡池内容 */
    content_before_act: string;
    /** 卡池角色头像 */
    pool: Array<GachaPool>;
    /** 卡池角色语音头像 */
    voice_icon: string;
    /** 卡池角色语音 URL */
    voice_url: string;
    /** 卡池角色语音状态 */
    voice_status: string;
    /** 卡池开始时间 */
    start_time: string;
    /** 卡池结束时间 */
    end_time: string;
  };

  /**
   * 卡池数据
   * @since Beta v0.7.2
   */
  type GachaPool = {
    /** 头像 */
    icon: string;
    /** 链接 */
    url: string;
  };

  /**
   * 活动返回响应
   * @since Beta v0.7.2
   */
  type PositionResp = TGApp.BBS.Response.BaseWithData<PositionRes>;

  /**
   * 活动返回数据
   * @since Beta v0.7.2
   */
  type PositionRes = {
    /** 活动列表 */
    list: Array<ObcItem<PositionItem>>;
  };

  /**
   * 观测枢通用接口
   * @since Beta v0.7.2
   */
  type ObcItem<T = unknown> = {
    /** ID */
    id: number;
    /** 名称 */
    name: string;
    /** 父 ID */
    parent_id: number;
    /** 深度 */
    depth: number;
    /** 结构化扩展信息 */
    ch_ext: string;
    /** 子项递归 */
    children: Array<ObcItem<T>>;
    /** 列表 */
    list: Array<T>;
  };

  /**
   * 热点追踪信息
   * @since Beta v0.7.2
   */
  type PositionItem = {
    /** 推荐 ID */
    recommend_id: number;
    /** 内容 ID */
    content_id: number;
    /** 角标 */
    corner_mark: string;
    /** 标题 */
    title: string;
    /** 扩展信息 */
    ext: string;
    /** 类型 */
    type: number;
    /** 链接 */
    url: string;
    /** 图标 */
    icon: string;
    /** 摘要 */
    abstract: string;
    /** 作者 */
    article_user_name: string;
    /** 头像 */
    avatar_url: string;
    /** 时间 */
    article_time: string;
    /** 创建时间（如 2023-03-31 11:16:57） */
    create_time: string;
    /** 结束时间（如 1680465599000） */
    end_time: string;
  };
}
