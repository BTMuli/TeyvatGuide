/**
 * 游戏-活动日历相关类型定义文件
 * @since Beta v0.8.3
 */

declare namespace TGApp.Game.ActCalendar {
  /**
   * 获取活动日历返回响应
   * @since Beta v0.8.0
   */
  type Response = TGApp.BBS.Response.BaseWithData<ActRes>;

  /**
   * 活动日历返回数据
   * @since Beta v0.8.0
   */
  type ActRes = {
    /** 角色卡池列表 */
    avatar_card_pool_list: Array<ActPool>;
    /** 武器卡池列表 */
    weapon_card_pool_list: Array<ActPool>;
    /** 混合卡池列表 */
    mixed_card_pool_list: Array<ActPool>;
    /** 选中角色卡池列表 */
    selected_avatar_card_pool_list: Array<ActPool>;
    /** 选中混合卡池列表 */
    selected_mixed_card_pool_list: Array<ActPool>;
    /** 活动列表 */
    act_list: Array<ActItem>;
    /** 固定活动列表 */
    fixed_act_list: Array<ActItem>;
    /** 选中活动列表 */
    selected_act_list: Array<ActItem>;
  };

  /**
   * 活动卡池信息
   * @since Beta v0.8.0
   */
  type ActPool = {
    /** 卡池id */
    pool_id: number;
    /** 游戏版本 - 5.8 */
    version_name: string;
    /** 卡池名称 - 角色活动祈愿 */
    pool_name: string;
    /** 卡池类型 - 1:角色活动祈愿, 2:武器活动祈愿, 3:混合活动祈愿 */
    pool_type: number;
    /** 角色列表 */
    avatars: Array<ActPoolAvatar>;
    /** 武器列表 */
    weapons: Array<ActPoolWeapon>;
    /** 开始时间戳(秒) */
    start_timestamp: string;
    /** 开始时间 */
    start_time: TGApp.Game.Base.DateTime;
    /** 结束时间戳(秒) */
    end_timestamp: string;
    /** 结束时间 */
    end_time: TGApp.Game.Base.DateTime;
    /** 跳转链接 */
    jump_url: string;
    /** 卡池状态 // 1:未开始 2:进行中 3:已结束 */
    pool_status: number;
    /** 距离结束倒计时(秒) */
    countdown_seconds: number;
  };

  /**
   * 角色卡池数据
   * @since Beta v0.8.0
   */
  type ActPoolAvatar = {
    /** 角色id */
    id: number;
    /** 角色图标 */
    icon: string;
    /** 角色名称 */
    name: string;
    /** 角色元素（英文） */
    element: string;
    /** 角色星级 */
    rarity: number;
    /** 是否隐藏 */
    is_invisible: boolean;
  };

  /**
   * 武器卡池数据
   * @since Beta v0.8.0
   */
  type ActPoolWeapon = {
    /** 武器id */
    id: number;
    /** 武器图标 */
    icon: string;
    /** 武器星级 */
    rarity: number;
    /** 武器名称 */
    name: string;
    /** 百科链接 */
    wiki_url: string;
  };

  /**
   * 活动类型枚举
   * @since Beta v0.8.0
   * @remarks TODO:可能不完整，等待补充
   */
  const ActType = <const>{
    /** 幽境危战 */
    HardChallenge: "ActTypeHardChallenge",
    /** 真境剧诗 */
    RoleCombat: "ActTypeRoleCombat",
    /** 深渊螺旋 */
    Tower: "ActTypeTower",
    /** 双倍活动 */
    Double: "ActTypeDouble",
    /** 探索活动 */
    Explore: "ActTypeExplore",
    /** 其他活动 */
    Other: "ActTypeOther",
  };

  /**
   * 活动类型枚举
   * @since Beta v0.8.0
   */
  type ActTypeEnum = (typeof ActType)[keyof typeof ActType] | string;

  /**
   * 活动信息
   * @since Beta v0.8.0
   */
  type ActItem =
    | ActItemHardChallenge
    | ActItemRoleCombat
    | ActItemTower
    | ActItemDouble
    | ActItemExplore
    | ActItemOther;

  /**
   * 活动信息-通用
   * @since Beta v0.8.0
   */
  type ActItemBase<T extends ActTypeEnum> = {
    /** 活动id */
    id: number;
    /** 活动名称 */
    name: string;
    /** 活动类型 */
    type: T;
    /** 开始时间戳(秒) */
    start_timestamp: string;
    /** 开始时间 */
    start_time: TGApp.Game.Base.DateTime;
    /** 结束时间戳(秒) */
    end_timestamp: string;
    /** 结束时间 */
    end_time: TGApp.Game.Base.DateTime;
    /** 活动描述 */
    desc: string;
    /** 活动攻略 */
    strategy: string;
    /** 距离结束倒计时(秒) */
    countdown_seconds: number;
    /**
     * 活动状态
     * @remarks
     * 1:未开始
     * 2:进行中
     * 3:已结束
     */
    status: number;
    /** 活动奖励列表 */
    reward_list: Array<ActReward>;
    /** 是否完成 */
    is_finished: boolean;
  };

  /**
   * 活动奖励信息
   * @since Beta v0.8.0
   */
  type ActReward = {
    /** 物品id */
    item_id: number;
    /** 物品名称 */
    name: string;
    /** 物品图标 */
    icon: string;
    /** 物品百科链接 */
    wiki_url: string;
    /** 物品数量 */
    num: number;
    /** 物品稀有度 */
    rarity: string;
    /** 是否首页展示 */
    homepage_show: boolean;
  };

  /**
   * 活动信息-幽境危战
   * @since Beta v0.8.0
   */
  type ActItemHardChallenge = ActItemBase<"ActTypeHardChallenge"> & {
    /** 幽境危战活动详情 */
    hard_challenge_detail: ActHardChallenge;
  };

  /**
   * 幽境危战活动详情
   * @since Beta v0.8.0
   */
  type ActHardChallenge = {
    /** 是否解锁 */
    is_unlock: boolean;
    /** 当前难度 */
    difficulty: number;
    /** 挑战耗时(秒) */
    second: number;
    /** 活动图标 */
    icon: string;
    /** 子信息 */
    sub: ActHardChallengeSub;
  };

  /**
   * 幽境危战子信息
   * @since Beta v0.8.0
   */
  type ActHardChallengeSub = {
    /** 挑战耗时(秒) */
    seconds: number;
    /** 未知参数 */
    x: number;
    /** 未知参数 */
    y: number;
  };

  /**
   * 活动信息-真境剧诗
   * @since Beta v0.8.0剧诗活动详情
   */
  type ActItemRoleCombat = ActItemBase<"ActTypeRoleCombat"> & {
    /** 真境剧诗活动详情 */
    role_combat_detail: ActRoleCombat;
  };

  /**
   * 真境剧诗活动详情
   * @since Beta v0.8.3
   */
  type ActRoleCombat = {
    /** 难度id */
    difficulty_id: number;
    /** 是否有数据 */
    has_data: boolean;
    /** 是否解锁 */
    is_unlock: boolean;
    /** 最大回合数 */
    max_round_id: number;
    /** 塔罗牌完成数 */
    tarot_finished_cnt: number;
  };

  /**
   * 活动信息-深渊螺旋
   * @since Beta v0.8.0
   */
  type ActItemTower = ActItemBase<"ActTypeTower"> & {
    /** 深渊螺旋活动详情 */
    tower_detail: ActTower;
  };

  /**
   * 深渊螺旋活动详情
   * @since Beta v0.8.0
   */
  type ActTower = {
    /** 是否解锁 */
    is_unlock: boolean;
    /** 最大星数 */
    max_star: number;
    /** 总星数 */
    total_star: number;
    /** 是否有数据 */
    has_data: boolean;
  };

  /**
   * 活动信息-双倍活动
   * @since Beta v0.8.0
   */
  type ActItemDouble = ActItemBase<"ActTypeDouble"> & {
    /** 双倍活动详情 */
    double_detail: ActDouble;
  };

  /**
   * 双倍活动详情
   * @since Beta v0.8.0
   */
  type ActDouble = {
    /** 总次数 */
    total: number;
    /** 剩余次数 */
    left: number;
  };

  /**
   * 活动信息-探索活动
   * @since Beta v0.8.0
   */
  type ActItemExplore = ActItemBase<"ActTypeExplore"> & {
    /** 探索活动详情 */
    explore_detail: ActExplore;
  };

  /**
   * 探索活动详情
   * @since Beta v0.8.0
   */
  type ActExplore = {
    /** 探索进度百分比 */
    explore_percent: number;
    /** 是否完成 */
    is_finished: boolean;
  };

  /**
   * 活动信息-其他活动
   * @since Beta v0.8.0
   */
  type ActItemOther = ActItemBase<"ActTypeOther"> & {
    /** 是否完成 */
    is_finished: boolean;
  };
}
