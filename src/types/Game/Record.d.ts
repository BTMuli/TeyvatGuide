/**
 * 原神战绩相关类型定义文件
 * @since Beta v0.11.5
 */

declare namespace TGApp.Game.Record {
  /**
   * 原神战绩数据返回响应
   *
   * @since Alpha v0.2.0
   */
  type Resp = TGApp.BBS.Response.BaseWithData<FullData>;

  /**
   * 游戏战绩卡片响应
   * @since Beta v0.11.5
   */
  type CardResp = TGApp.BBS.Response.BaseWithData<CardData>;

  /**
   * 游戏战绩卡片返回数据
   * @since Beta v0.11.5
   */
  type CardData = {
    /** 游戏战绩卡片列表 */
    list: Array<Card>;
  };

  /**
   * 游戏战绩卡片
   * @since Beta v0.11.5
   */
  type Card = {
    /** 是否已绑定该游戏账号 */
    has_role: boolean;
    /** 游戏 ID */
    game_id: number;
    /** 游戏账号 ID */
    game_role_id: string;
    /** 游戏账号昵称 */
    nickname: string;
    /** 游戏服务器 */
    region: string;
    /** 游戏等级 */
    level: number;
    /** 战绩卡片背景图片 */
    background_image: string;
    /** 是否公开战绩 */
    is_public: boolean;
    /** 战绩摘要数据 */
    data: Array<CardDataItem>;
    /** 数据开关 */
    data_switches: Array<CardDataSwitch>;
    /** H5 数据开关 */
    h5_data_switches: Array<unknown>;
    /** 游戏服务器名称 */
    region_name: string;
    /** 战绩卡片跳转链接 */
    url: string;
    /** 卡片背景颜色 */
    background_color: string;
    /** v2 卡片背景图片 */
    background_image_v2: string;
    /** 游戏 Logo */
    logo: string;
    /** 游戏名称 */
    game_name: string;
  };

  /**
   * 游戏战绩卡片摘要数据
   * @since Beta v0.11.5
   */
  type CardDataItem = {
    /** 数据名称 */
    name: string;
    /** 数据类型 */
    type: number;
    /** 数据值 */
    value: string;
  };

  /**
   * 游戏战绩卡片数据开关
   * @since Beta v0.11.5
   */
  type CardDataSwitch = {
    /** 开关 ID */
    switch_id: number;
    /** 是否公开 */
    is_public: boolean;
    /** 开关名称 */
    switch_name: string;
  };

  /**
   * 原神战绩返回数据
   * @since Beta v0.11.5
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
    /** 世界探索展示分组信息 */
    world_explore_display: Array<WorldExploreDisplayConfig>;
    /** 旧接口字段名；仅用于读取历史原始快照 */
    world_exploration_display?: Array<WorldExploreDisplayConfig>;
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
   * 角色元素枚举
   * @since Beta v0.11.5
   */
  const AvatarElement = <const>{
    /** 风元素 */
    ANEMO: "Anemo",
    /** 岩元素 */
    GEO: "Geo",
    /** 雷元素 */
    ELECTRO: "Electro",
    /** 草元素 */
    DENDRO: "Dendro",
    /** 水元素 */
    HYDRO: "Hydro",
    /** 火元素 */
    PYRO: "Pyro",
    /** 冰元素 */
    CRYO: "Cryo",
  };

  /**
   * 角色元素枚举类型
   * @since Beta v0.11.5
   */
  type AvatarElementEnum = (typeof AvatarElement)[keyof typeof AvatarElement];

  /**
   * 角色列表类型
   * @since Beta v0.11.5
   */
  type Avatar = {
    /** 角色 ID */
    id: number;
    /** 角色头像 */
    image: string;
    /** 角色名称 */
    name: string;
    /** 角色元素 */
    element: AvatarElementEnum;
    /** 好感等级 */
    fetter: number;
    /** 角色等级 */
    level: number;
    /** 稀有度 */
    rarity: number;
    /** 已激活命座数量 */
    actived_constellation_num: number;
    /** 卡片图片 */
    card_image: string;
    /** 是否展示 */
    is_chosen: boolean;
    /** 武器，通常为 null */
    weapon: unknown;
    /** 圣遗物，通常为空数组 */
    relics: Array<unknown>;
  };

  /**
   * 统计信息类型
   * @since Beta v0.11.5
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
    /** 数据对应链接映射 */
    field_ext_map: FieldExtMap;
    /** 满好感角色数 */
    full_fetter_avatar_num: number;
    /** 岩神瞳数量 */
    geoculus_number: number;
    /** 幽境危战挑战数据 */
    hard_challenge: ChallengeStats;
    /** 水神瞳数量 */
    hydroculus_number: number;
    /** 冰神瞳数量 */
    iceculus_number: number;
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
   * 战绩字段扩展链接映射类型
   * @since Beta v0.11.5
   */
  type FieldExtMap = Record<string, FieldExtMapItem>;

  /**
   * 战绩字段扩展链接类型
   * @since Beta v0.11.5
   */
  type FieldExtMapItem = {
    /** 主链接 */
    link: string;
    /** 备用链接 */
    backup_link: string;
  };

  /**
   * 世界探索信息类型枚举
   * @since Beta v0.11.5
   */
  const WorldExploreType = <const>{
    /** 声望 */
    REPUTATION: "Reputation",
    /** 奉献 */
    OFFERING: "Offering",
    /** 未知类型 */
    UNKNOWN: "TypeUnknow",
  };

  /**
   * 世界探索信息类型枚举类型
   * @since Beta v0.11.5
   */
  type WorldExploreTypeEnum = (typeof WorldExploreType)[keyof typeof WorldExploreType];

  /**
   * 幻想真境剧诗数据类型
   * @since Beta v0.10.0
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
    /** 圣牌解锁数量 */
    tarot_finished_cnt: number;
    /** 困难等级 */
    difficulty_id: TGApp.Game.Combat.DiffEnum;
  };

  /**
   * 幽境危战挑战数据类型
   * @since Beta v0.9.9
   */
  type ChallengeStats = {
    /** 是否解锁 */
    is_unlock: boolean;
    /** 挑战难度 */
    difficulty: TGApp.Game.Challenge.DiffEnum;
    /** 是否有数据 */
    has_data: boolean;
    /** 挑战名称 */
    name: string;
  };

  /**
   * 世界探索信息类型
   * @since Beta v0.11.5
   */
  type WorldExplore = {
    /** 声望等级 */
    level: number;
    /** 探索千分比 */
    exploration_percentage: number;
    /**
     * 图标
     * @remarks 可能为空
     */
    icon: string;
    /** 名称 */
    name: string;
    /** 类型 */
    type: WorldExploreTypeEnum;
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
    /**
     * 背景图片 URL
     * @remarks 可能为空
     */
    background_image: string;
    /**
     * 内部图标 URL
     * @remarks 可能为空
     */
    inner_icon: string;
    /**
     * 封面 URL
     * @remarks 可能为空
     */
    cover: string;
    /** 区域探索列表 */
    area_exploration_list: Array<AreaExploration>;
    /** Boss 列表 */
    boss_list: Array<AreaBoss>;
    /** 是否热门 */
    is_hot: boolean;
    /** 索引激活 */
    index_active: boolean;
    /** 详细激活 */
    detail_active: boolean;
    /** 七天神像等级 */
    seven_statue_level: number;
    /**
     * 纳塔声望
     * @remarks 用于标识纳塔地区声望，其余地区该值为 null
     */
    natan_reputation: NataReputation | null;
    /** 世界类型 */
    world_type: number;
  };

  /**
   * 世界探索展示结果类型
   * @since Beta v0.11.5
   * @remarks 在读取层合并 `world_explorations` 与展示分组数据
   */
  type WorldExploreDisplay = WorldExplore & {
    /** 按接口展示分组整理后的子区域 */
    children: Array<WorldExploreDisplayItem>;
    /** 按父子关系及展示分组整理的全部子区域原始数据 */
    detail_worlds: Array<WorldExplore>;
  };

  /**
   * 世界探索展示子项类型
   * @since Beta v0.11.5
   */
  type WorldExploreDisplayItem = {
    /** 对应的区域 ID 列表 */
    area_ids: Array<number>;
    /** 展示名称 */
    name: string;
    /** 展示探索千分比 */
    exploration_percentage: number;
  };

  /**
   * 世界探索展示分组原始配置类型
   * @since Beta v0.11.5
   */
  type WorldExploreDisplayConfig = {
    /** 探索区域 ID */
    exploration_id: number;
    /** 展示分组 */
    group: WorldExploreDisplayGroup;
  };

  /**
   * 世界探索展示分组类型
   * @since Beta v0.11.5
   */
  type WorldExploreDisplayGroup = {
    /** 区域探索项 */
    items: Array<WorldExploreDisplayConfigItem>;
  };

  /**
   * 世界探索展示配置项类型
   * @since Beta v0.11.5
   */
  type WorldExploreDisplayConfigItem = {
    /** 区域 ID 列表 */
    area_ids: Array<number>;
    /** 探索千分比 */
    exploration_percentage: number;
  };

  /**
   * 奉献物品类型
   * @since Beta v0.11.5
   */
  type WorldOffering = {
    /** 名称 */
    name: string;
    /** 等级 */
    level: number;
    /** 图标 */
    icon: string;
    /** 开启状态 */
    open_state: WorldOfferingOpenStateEnum;
  };

  /**
   * 世界奉献物品开启状态枚举
   * @since Beta v0.11.5
   */
  const WorldOfferingOpenState = <const>{
    /** 未知状态 */
    UNKNOWN: "OfferingOpenStateUnknow",
    /** 已锁定 */
    LOCKED: "OfferingOpenStateLocked",
    /** 已解锁 */
    UNLOCKED: "OfferingOpenStateUnlocked",
  };

  /**
   * 世界奉献物品开启状态枚举类型
   * @since Beta v0.11.5
   */
  type WorldOfferingOpenStateEnum =
    (typeof WorldOfferingOpenState)[keyof typeof WorldOfferingOpenState];

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
   * 区域Boss类型
   * @since Beta v0.10.0
   */
  type AreaBoss = {
    /** 名称 */
    name: string;
    /** 击杀数 */
    kill_num: number;
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
   * @since Beta v0.10.0
   */
  type NataOffering = {
    /** 图标 */
    icon: string;
    /** 图片 */
    image: string;
    /** 名称 */
    name: string;
    /** ID */
    id: number;
    /** 等级 */
    level: number;
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
