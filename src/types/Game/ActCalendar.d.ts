/**
 * @file src/types/Game/ActCalendar.d.ts
 * @description 游戏-活动日历相关类型定义文件
 * @since Beta v0.8.0
 */

declare namespace TGApp.Game.ActCalendar {
  /**
   * @description 获取活动日历返回响应
   * @since Beta v0.8.0
   * @interface Response
   * @extends TGApp.BBS.Response.BaseWithData
   * @property {ActRes} data - 返回数据
   */
  type Response = TGApp.BBS.Response.BaseWithData<ActRes>;

  /**
   * @description 活动日历返回数据
   * @since Beta v0.8.0
   * @interface ActRes
   * @property {Array<ActPool>} avatar_card_pool_list 角色卡池列表
   * @property {Array<ActPool>} weapon_card_pool_list 武器卡池列表
   * @property {Array<ActPool>} mixed_card_pool_list 混合卡池列表
   * @property {Array<ActPool>} selected_avatar_card_pool_list 选中角色卡池列表 // TODO:未知用途
   * @property {Array<ActPool>} selected_mixed_card_pool_list 选中混合卡池列表 // TODO:未知用途
   * @property {Array<ActItem>} act_list 活动列表
   * @property {Array<ActItem>} fixed_act_list 固定活动列表
   * @property {Array<ActItem>} selected_act_list 选中活动列表 // TODO:未知用途
   */
  type ActRes = {
    avatar_card_pool_list: Array<ActPool>;
    weapon_card_pool_list: Array<ActPool>;
    mixed_card_pool_list: Array<ActPool>;
    selected_avatar_card_pool_list: Array<ActPool>;
    selected_mixed_card_pool_list: Array<ActPool>;
    act_list: Array<ActItem>;
    fixed_act_list: Array<ActItem>;
    selected_act_list: Array<ActItem>;
  };

  /**
   * @description 活动卡池信息
   * @since Beta v0.8.0
   * @interface ActPool
   * @property {number} pool_id 卡池id
   * @property {string} version_name 游戏版本 - 5.8
   * @property {string} pool_name 卡池名称 - 角色活动祈愿
   * @property {number} pool_type 卡池类型 - 1:角色活动祈愿, 2:武器活动祈愿, 3:
   * @property {Array<ActPoolAvatar>} avatars 角色列表
   * @property {Array<ActPoolWeapon>} weapons 武器列表
   * @property {string} start_timestamp 开始时间戳(秒)
   * @property {TGApp.Game.Base.DateTime} start_time 开始时间
   * @property {string} end_timestamp 结束时间戳(秒)
   * @property {TGApp.Game.Base.DateTime} end_time 结束时间
   * @property {string} jump_url 跳转链接
   * @property {number} pool_status 卡池状态 // 1:未开始 2:进行中 3:已结束
   * @property {number} countdown_seconds 距离结束倒计时(秒)
   */
  type ActPool = {
    pool_id: number;
    version_name: string;
    pool_name: string;
    pool_type: number;
    avatars: Array<ActPoolAvatar>;
    weapons: Array<ActPoolWeapon>;
    start_timestamp: string;
    start_time: TGApp.Game.Base.DateTime;
    end_timestamp: string;
    end_time: TGApp.Game.Base.DateTime;
    jump_url: string;
    pool_status: number;
    countdown_seconds: number;
  };

  /**
   * @description 角色卡池数据
   * @since Beta v0.8.0
   * @interface ActPoolAvatar
   * @property {number} id 角色id
   * @property {string} icon 角色图标
   * @property {string} name 角色名称
   * @property {string} element 角色元素（英文）
   * @property {number} rarity 角色星级
   * @property {boolean} is_invisible 是否隐藏
   */
  type ActPoolAvatar = {
    id: number;
    icon: string;
    name: string;
    element: string;
    rarity: number;
    is_invisible: boolean;
  };

  /**
   * @description 武器卡池数据
   * @since Beta v0.8.0
   * @interface ActPoolWeapon
   * @property {number} id 武器id
   * @property {string} icon 武器图标
   * @property {number} rarity 武器星级
   * @property {string} name 武器名称
   * @property {string} wiki_url 百科链接
   */
  type ActPoolWeapon = {
    id: number;
    icon: string;
    rarity: number;
    name: string;
    wiki_url: string;
  };

  /**
   * @description 活动类型枚举
   * @since Beta v0.8.0
   * @const ActType
   * @todo 可能不完整，等待补充
   * @property {string} "ActTypeHardChallenge" 幽境危战
   * @property {string} "ActTypeRoleCombat" 真境剧诗
   * @property {string} "ActTypeTower" 深渊螺旋
   * @property {string} "ActTypeDouble" 双倍活动
   * @property {string} "ActTypeExplore" 探索活动
   * @property {string} "ActTypeOther" 其他活动
   */
  const ActType = <const>{
    HardChallenge: "ActTypeHardChallenge",
    RoleCombat: "ActTypeRoleCombat",
    Tower: "ActTypeTower",
    Double: "ActTypeDouble",
    Explore: "ActTypeExplore",
    Other: "ActTypeOther",
  };

  /**
   * @description 活动类型枚举
   * @since Beta v0.8.0
   * @enum ActTypeEnum
   */
  type ActTypeEnum = (typeof ActType)[keyof typeof ActType] | string;

  /**
   * @description 活动信息
   * @since Beta v0.8.0
   * @interface ActItem
   */
  type ActItem =
    | ActItemHardChallenge
    | ActItemRoleCombat
    | ActItemTower
    | ActItemDouble
    | ActItemExplore
    | ActItemOther;

  /**
   * @description 活动信息-通用
   * @since Beta v0.8.0
   * @interface ActItemBase
   * @template T
   * @property {number} id 活动id
   * @property {string} name 活动名称
   * @property {T} type 活动类型
   * @property {string} start_timestamp 开始时间戳(秒)
   * @property {TGApp.Game.Base.DateTime} start_time 开始时间
   * @property {string} end_timestamp 结束时间戳(秒)
   * @property {TGApp.Game.Base.DateTime} end_time 结束时间
   * @property {string} desc 活动描述
   * @property {string} strategy 活动攻略
   * @property {number} countdown_seconds 距离结束倒计时(秒)
   * @property {number} status 活动状态 // 1:未开始 2:进行中 3:已结束
   * @property {Array<ActReward>} reward_list 活动奖励列表
   * @property {boolean} is_finished 是否完成
   */
  type ActItemBase<T extends ActTypeEnum> = {
    id: number;
    name: string;
    type: T;
    start_timestamp: string;
    start_time: TGApp.Game.Base.DateTime;
    end_timestamp: string;
    end_time: TGApp.Game.Base.DateTime;
    desc: string;
    strategy: string;
    countdown_seconds: number;
    status: number;
    reward_list: Array<ActReward>;
    is_finished: boolean;
  };

  /**
   * @description 活动奖励信息
   * @since Beta v0.8.0
   * @interface ActReward
   * @property {number} item_id 物品id
   * @property {string} name 物品名称
   * @property {string} icon 物品图标
   * @property {string} wiki_url 物品百科链接
   * @property {number} num 物品数量
   * @property {string} rarity 物品稀有度
   * @property {boolean} homepage_show 是否首页展示
   */
  type ActReward = {
    item_id: number;
    name: string;
    icon: string;
    wiki_url: string;
    num: number;
    rarity: string;
    homepage_show: boolean;
  };

  /**
   * @description 活动信息-幽境危战
   * @since Beta v0.8.0
   * @interface ActItemHardChallenge
   * @extends ActItemBase<"ActTypeHardChallenge">
   * @property {ActHardChallenge} hard_challenge_detail 幽境危战活动详情
   */
  type ActItemHardChallenge = ActItemBase<"ActTypeHardChallenge"> & {
    hard_challenge_detail: ActHardChallenge;
  };

  /**
   * @description 幽境危战活动详情
   * @since Beta v0.8.0
   * @interface ActHardChallenge
   * @property {boolean} is_unlock 是否解锁
   * @property {number} difficulty 当前难度
   * @property {number} second 挑战耗时(秒)
   * @property {string} icon 活动图标
   * @property {ActHardChallengeSub} sub 子信息
   */
  type ActHardChallenge = {
    is_unlock: boolean;
    difficulty: number;
    second: number;
    icon: string;
    sub: ActHardChallengeSub;
  };

  /**
   * @description 幽境危战子信息
   * @since Beta v0.8.0
   * @interface ActHardChallengeSub
   * @property {number} seconds 挑战耗时(秒)
   * @property {number} x 未知参数
   * @property {number} y 未知参数
   */
  type ActHardChallengeSub = { seconds: number; x: number; y: number };

  /**
   * @description 活动信息-真境剧诗
   * @since Beta v0.8.0
   * @interface ActItemRoleCombat
   * @extends ActItemBase<"ActTypeRoleCombat">
   * @property {ActRoleCombat} role_combat_detail 真境剧诗活动详情
   */
  type ActItemRoleCombat = ActItemBase<"ActTypeRoleCombat"> & { role_combat_detail: ActRoleCombat };

  /**
   * @description 真境剧诗活动详情
   * @since Beta v0.8.0
   * @interface ActRoleCombat
   * @property {boolean} is_unlock 是否解锁
   * @property {number} max_round_id 最大回合数
   * @property {boolean} has_data 是否有数据
   */
  type ActRoleCombat = { is_unlock: boolean; max_round_id: number; has_data: boolean };

  /**
   * @description 活动信息-深渊螺旋
   * @since Beta v0.8.0
   * @interface ActItemTower
   * @extends ActItemBase<"ActTypeTower">
   * @property {ActTower} tower_detail 深渊螺旋活动详情
   */
  type ActItemTower = ActItemBase<"ActTypeTower"> & { tower_detail: ActTower };

  /**
   * @description 深渊螺旋活动详情
   * @since Beta v0.8.0
   * @interface ActTower
   * @property {boolean} is_unlock 是否解锁
   * @property {number} max_star 最大星数
   * @property {number} total_star 总星数
   * @property {boolean} has_data 是否有数据
   */
  type ActTower = { is_unlock: boolean; max_star: number; total_star: number; has_data: boolean };

  /**
   * @description 活动信息-双倍活动
   * @since Beta v0.8.0
   * @interface ActItemDouble
   * @extends ActItemBase<"ActTypeDouble">
   * @property {ActDouble} double_detail 双倍活动详情
   */
  type ActItemDouble = ActItemBase<"ActTypeDouble"> & { double_detail: ActDouble };

  /**
   * @description 双倍活动详情
   * @since Beta v0.8.0
   * @interface ActDouble
   * @property {number} total 总次数
   * @property {number} left 剩余次数
   */
  type ActDouble = { total: number; left: number };

  /**
   * @description 活动信息-探索活动
   * @since Beta v0.8.0
   * @interface ActItemExplore
   * @extends ActItemBase<"ActTypeExplore">
   * @property {ActExplore} explore_detail 探索活动详情
   */
  type ActItemExplore = ActItemBase<"ActTypeExplore"> & { explore_detail: ActExplore };

  /**
   * @description 探索活动详情
   * @since Beta v0.8.0
   * @interface ActExplore
   * @property {number} explore_percent 探索进度百分比
   * @property {boolean} is_finished 是否完成
   */
  type ActExplore = { explore_percent: number; is_finished: boolean };

  /**
   * @description 活动信息-其他活动
   * @since Beta v0.8.0
   * @interface ActItemOther
   * @extends ActItemBase<"ActTypeOther">
   * @property {boolean} is_finished 是否完成
   */
  type ActItemOther = ActItemBase<"ActTypeOther"> & { is_finished: boolean };
}
