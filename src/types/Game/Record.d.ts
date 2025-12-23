/**
 * 原神战绩相关类型定义文件
 *
 * @since Beta v0.8.1
 */
declare namespace TGApp.Game.Record {
  /**
   * 原神战绩数据返回响应
   *
   * @since Alpha v0.2.0
   */
  type Resp = TGApp.BBS.Response.BaseWithData<FullData>;

  /**
   * 原神战绩返回数据
   *
   * @since Beta v0.7.2
   */
  type FullData = {
    /** 角色信息 */
    role: Role;
    /** 角色列表 */
    avatars: Array<Avatar>;
    /** 统计信息 */
    stats: Stats;
    /** 城市探索信息 */
    city_explorations: Array<unknown>;
    /** 世界探索信息 */
    world_explorations: Array<WorldExplore>;
    /** 尘歌壶信息 */
    homes: Array<Home>;
    /** 查询工具链接 */
    query_tool_link: string;
    /** 查询工具图片 */
    query_tool_image: string;
  };

  /**
   * 角色信息类型
   * @since Beta v0.5.0
   */
  type Role = {
    /** 角色头像，通常为 "" */
    AvatarUrl: string;
    /** 角色昵称 */
    nickname: string;
    /** 区域 */
    region: string;
    /** 等级 */
    level: number;
    /** 游戏头像 */
    game_head_icon: string;
  };

  /**
   * 角色列表类型
   * @since Beta v0.7.2
   */
  type Avatar = {
    /** 角色 ID */
    id: number;
    /** 角色头像 */
    image: string;
    /** 角色名称 */
    name: string;
    /** 角色元素 */
    element: string;
    /** 羁绊等级 */
    fetter: number;
    /** 角色等级 */
    level: number;
    /** 稀有度 */
    rarity: number;
    /** 已激活命座数量 */
    actived_constellation_num: number;
    /** 卡片图片 */
    card_image: number;
    /** 是否展示 */
    is_chosen: boolean;
    /** 武器，通常为 null */
    weapon: unknown;
    /** 圣遗物，通常为空数组 */
    relics: Array<unknown>;
  };

  /**
   * 统计信息类型
   * @since Beta v0.8.1
   */
  type Stats = {
    /** 成就数量 */
    achievement_number: number;
    /** 活跃天数 */
    active_day_number: number;
    /** 风神瞳数量 */
    anemoculus_number: number;
    /** 角色数量 */
    avatar_number: number;
    /** 普通宝箱数量 */
    common_chest_number: number;
    /** 草神瞳数量 */
    dendroculus_number: number;
    /** 解锁秘境数量 */
    domain_number: number;
    /** 雷神瞳数量 */
    electroculus_number: number;
    /** 精致宝箱数量 */
    exquisite_chest_number: number;
    /** 数据对应链接的 map，用不到设为 unknown */
    field_ext_map: unknown;
    /** 满好感角色数 */
    full_fetter_avatar_num: number;
    /** 岩神瞳数量 */
    geoculus_number: number;
    /** 幽境危战挑战数据 */
    hard_challenge: ChallengeStats;
    /** 水神瞳数量 */
    hydroculus_number: number;
    /** 豪华宝箱数量 */
    luxurious_chest_number: number;
    /** 奇馈宝箱数量 */
    magic_chest_number: number;
    /** 月神瞳数量 */
    moonoculus_number: number;
    /** 珍贵宝箱数量 */
    precious_chest_number: number;
    /** 火神瞳数量 */
    pyroculus_number: number;
    /** 幻想真境剧诗数据 */
    role_combat: CombatStats;
    /** 深境螺旋最深达到几层 */
    spiral_abyss: string;
    /** 解锁传送点数量 */
    way_point_number: number;
  };

  /**
   * 幻想真境剧诗数据类型
   * @since Beta v0.5.0
   */
  type CombatStats = {
    /** 是否解锁 */
    is_unlock: boolean;
    /** 最大报幕数 */
    max_round_id: number;
    /** 是否有数据 */
    has_data: boolean;
    /** 是否有详细数据 */
    has_detail_data: boolean;
  };

  /**
   * 幽境危战挑战数据类型
   * @since Beta v0.8.0
   */
  type ChallengeStats = {
    /** 是否解锁 */
    is_unlock: boolean;
    /** 挑战难度 */
    difficulty: number;
    /** 是否有数据 */
    has_data: boolean;
    /** 挑战名称 */
    name: string;
  };

  /**
   * 世界探索信息类型
   * @since Beta v0.8.1
   */
  type WorldExplore = {
    /** 声望等级 */
    level: number;
    /** 探索千分比 */
    exploration_percentage: number;
    /** 图标 */
    icon: string;
    /** 名称 */
    name: string;
    /** 类型
     * @example Reputation: 声望, Offering: 奉献
     */
    type: string;
    /** 奉献物品 */
    offerings: Array<WorldOffering>;
    /** ID */
    id: number;
    /** 父级 ID */
    parent_id: number;
    /** 地图 URL */
    map_url: string;
    /** 攻略 URL */
    strategy_url: string;
    /** 背景图片 URL */
    background_image: string;
    /** 内部图标 URL */
    inner_icon: string;
    /** 封面 URL */
    cover: string;
    /** 区域探索列表 */
    area_exploration_list: Array<AreaExploration>;
    /** Boss 列表 */
    boss_list: Array<unknown>;
    /** 是否热门 */
    is_hot: boolean;
    /** 索引激活 */
    index_active: boolean;
    /** 详细激活 */
    detail_active: boolean;
    /** 七天神像等级 */
    seven_status_level: number;
    /** 纳塔声望 */
    nata_reputation: NataReputation | null;
    /** 世界类型 */
    world_type: number;
  };

  /**
   * 奉献物品类型
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
   * 区域探索类型
   * @since Beta v0.8.1
   */
  type AreaExploration = {
    /** 名称 */
    name: string;
    /** 探索千分比 */
    exploration_percentage: number;
  };

  /**
   * 纳塔声望类型
   * @since Beta v0.7.2
   */
  type NataReputation = {
    /** 部落列表 */
    tribal_list: Array<NataOffering>;
  };

  /**
   * 部落列表类型
   */
  type NataOffering = WorldOffering & {
    /** ID */
    id: number;
    /** 图片 */
    image: string;
  };

  /**
   * 尘歌壶信息类型
   * @since Alpha v0.2.0
   */
  type Home = {
    /** 等级 */
    level: number;
    /** 访问次数 */
    visit_num: number;
    /** 最高洞天仙力 */
    comfort_num: number;
    /** 获得摆设数 */
    item_num: number;
    /** 名称 */
    name: string;
    /** 图标 */
    icon: string;
    /** 洞天仙力等级名称 */
    comfort_level_name: string;
    /** 洞天仙力等级图标 */
    comfort_level_icon: string;
  };
}
