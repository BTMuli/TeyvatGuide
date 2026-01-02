/**
 * 原神战绩类型定义文件
 * @since Beta v0.8.1
 */

declare namespace TGApp.Sqlite.Record {
  /**
   * 原神战绩数据
   * @since Beta v0.6.0
   * @remarks UserRecord 表
   * @TODO 直接从接口写入，不要转换
   */
  type TableRaw = {
    /** 用户 UID */
    uid: number;
    /**
     * 用户游戏信息
     * @remarks 序列化，反序列化后是 {@link Role} 数据
     */
    role: string;
    /**
     * 角色列表
     * @remarks 序列化，反序列化后是 {@link Avatar} 数组
     */
    avatars: string;
    /**
     * 统计信息
     * @remarks 序列化，反序列化后是 {@link Stats} 数据
     */
    stats: string;
    /**
     * 探索信息
     * @remarks 序列化，反序列化后是 {@link WorldExplore} 数组
     */
    worldExplore: string;
    /**
     * 尘歌壶信息
     * @remarks 序列化，反序列化后是 {@link Home} 数组
     */
    homes: string;
    /** 更新时间 */
    updated: string;
  };

  /**
   * 战绩数据
   * @since Beta v0.6.0
   * @remarks 解析自 {@link TableRaw} 数据
   */
  type TableTrans = {
    /** 用户 UID */
    uid: number;
    /** 游戏信息 */
    role: Role;
    /** 角色列表 */
    avatars: Array<Avatar>;
    /** 统计信息 */
    stats: Stats;
    /** 探索信息 */
    worldExplore: Array<WorldExplore>;
    /** 尘歌壶信息 */
    homes: Array<Home>;
    /** 更新时间 */
    updated: string;
  };

  /**
   * 用户信息
   * @since Beta v0.6.0
   */
  type Role = {
    /** 昵称 */
    nickname: string;
    /** 服务器 */
    region: string;
    /** 等级 */
    level: number;
    /** 头像 */
    avatar: string;
  };

  /**
   * 角色信息
   * @since Alpha v0.2.0
   */
  type Avatar = {
    /** 角色ID */
    id: number;
    /** 名称 */
    name: string;
    /**
     * 元素
     * @example 火水草雷风岩冰
     */
    element: string;
    /**
     * 好感度
     * @remarks 奇偶跟旅行者好感度恒为0
     */
    fetter: number;
    /** 等级 */
    level: number;
    /** 稀有度 */
    star: number;
    /** 命座数 */
    constellation: number;
    /** 是否设为展示角色 */
    isShow: 0 | 1;
  };

  /**
   * 统计信息
   * @since Beta v0.8.1
   */
  type Stats = {
    /** 活跃天数 */
    activeDays: number;
    /** 成就达成数 */
    achievementNumber: number;
    /** 持有角色数 */
    avatarNumber: number;
    /** 满好感角色数 */
    avatarFetter: number;
    /** 解锁传送点数 */
    wayPoints: number;
    /** 解锁秘境数 */
    domainNumber: number;
    /** 风神瞳数 */
    anemoCulus: number;
    /** 岩神瞳数 */
    geoCulus: number;
    /** 雷神瞳 */
    electroCulus: number;
    /** 草神瞳数 */
    dendroCulus: number;
    /** 水神瞳数 */
    hydroCulus: number;
    /** 火神瞳数 */
    pyroCulus: number;
    /** 月神瞳数 */
    moonCulus: number;
    /** 深渊 */
    sprialAbyss: string;
    /** 剧诗 */
    combatRole: string;
    /** 危战 */
    hardChallenge: string;
    /** 华丽宝箱数 */
    luxuriousChest: number;
    /** 珍贵宝箱数 */
    preciousChest: number;
    /** 精致宝箱数 */
    exquisiteChest: number;
    /** 普通宝箱数 */
    commonChest: number;
    /** 奇馈宝箱数 */
    magicChest: number;
  };

  /**
   * 世界探索信息
   * @since Beta v0.8.1
   */
  type WorldExplore = {
    /** 地区ID */
    id: number;
    /** 地区名称 */
    name: string;
    /** 浅色模式下的图标 */
    iconLight: string;
    /** 背景 */
    bg: string;
    /** 封面 */
    cover: string;
    /** 地区声望等级 */
    reputation?: number;
    /** 供奉信息 */
    offerings?: Array<WorldOffering>;
    /** 探索度 */
    exploration: number;
    /** 探索进度 */
    area_exploration_list?: Array<AreaExploration>;
    /** 子地区 */
    children: Array<WorldChild>;
  };

  /**
   * 地区供奉信息
   * @since Alpha v0.2.0
   */
  type WorldOffering = {
    /** 名称 */
    name: string;
    /** 等级 */
    level: number;
    /** 图标 */
    icon: string;
  };

  /**
   * 区域探索
   * @since Beta v0.8.1
   */
  type AreaExploration = {
    /** 名称 */
    name: string;
    /** 千分比 */
    exploration_percentage: number;
  };

  /**
   * 子地区
   * @since Beta v0.4.3
   */
  type WorldChild = {
    /** 地区 ID */
    id: number;
    /** 名称 */
    name: string;
    /** 探索千分比 */
    exploration: number;
  };

  /**
   * 尘歌壶信息
   * @since Alpha v0.2.0
   */
  type Home = {
    /** 洞天仙力图标 */
    comfortIcon: string;
    /** 洞天仙力名称 */
    comfortName: string;
    /** 洞天名称 */
    name: string;
    /** 信任等阶 */
    level: number;
    /** 最高洞天仙力 */
    comfort: number;
    /** 获得摆设数 */
    furniture: number;
    /** 历史访客数 */
    visit: number;
    /** 背景 */
    bg: string;
  };
}
