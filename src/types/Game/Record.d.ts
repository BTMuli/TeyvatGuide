/**
 * @file types/Game/Record.d.ts
 * @description 原神战绩相关类型定义文件
 * @since Beta v0.8.0
 */

declare namespace TGApp.Game.Record {
  /**
   * @description 原神战绩数据返回类型
   * @interface Response
   * @since Alpha v0.2.0
   * @extends TGApp.BBS.Response.BaseWithData
   * @property {FullData} data - 原神战绩数据
   * @return Response
   */
  type Response = TGApp.BBS.Response.BaseWithData<FullData>;

  /**
   * @description 原神战绩数据类型
   * @interface FullData
   * @since Beta v0.7.2
   * @property {Role} role - 角色信息
   * @property {Array<Avatar>} avatars - 角色列表
   * @property {Stats} stats - 统计信息
   * @property {Array<unknown>} city_explorations - 城市探索信息
   * @property {Array<WorldExplore>} world_explorations - 世界探索信息
   * @property {Array<Home>} homes - 尘歌壶信息
   * @property {string} query_tool_link - 查询工具链接
   * @property {string} query_tool_image - 查询工具图片
   * @return FullData
   */
  type FullData = {
    role: Role;
    avatars: Array<Avatar>;
    stats: Stats;
    city_explorations: Array<unknown>;
    world_explorations: Array<WorldExplore>;
    homes: Array<Home>;
    query_tool_link: string;
    query_tool_image: string;
  };

  /**
   * @description 角色信息类型
   * @interface Role
   * @since Beta v0.5.0
   * @property {string} AvatarUrl - 角色头像 // 通常为 ""
   * @property {string} nickname - 角色昵称
   * @property {string} region - 区域
   * @property {number} level - 等级
   * @property {string} game_head_icon - 游戏头像
   * @return Role
   */
  type Role = {
    AvatarUrl: string;
    nickname: string;
    region: string;
    level: number;
    game_head_icon: string;
  };

  /**
   * @description 角色列表类型
   * @interface Avatar
   * @since Beta v0.7.2
   * @property {number} id - 角色 ID
   * @property {string} image - 角色头像
   * @property {string} name - 角色名称
   * @property {string} element - 角色元素
   * @property {number} fetter - 角色羁绊等级
   * @property {number} level - 角色等级
   * @property {number} rarity - 角色稀有度
   * @property {number} actived_constellation_num - 角色已激活命座数量
   * @property {number} card_image - 角色卡片图片
   * @property {boolean} is_chosen - 角色是否展示
   * @property {unknown} weapon - 角色武器 // null
   * @property {Array<unknown>} relics - 角色圣遗物 // []
   * @return Avatar
   */
  type Avatar = {
    id: number;
    image: string;
    name: string;
    element: string;
    fetter: number;
    level: number;
    rarity: number;
    actived_constellation_num: number;
    card_image: number;
    is_chosen: boolean;
    weapon: unknown;
    relics: Array<unknown>;
  };

  /**
   * @description 统计信息类型
   * @interface Stats
   * @since Beta v0.8.0
   * @property {number} active_day_number - 活跃天数
   * @property {number} achievement_number - 成就数量
   * @property {number} anemoculus_number - 风神瞳数量
   * @property {number} geoculus_number - 岩神瞳数量
   * @property {number} avatar_number - 角色数量
   * @property {number} way_point_number - 解锁传送点数量
   * @property {number} domain_number - 解锁秘境数量
   * @property {string} spiral_abyss - 深境螺旋最深达到几层
   * @property {number} precious_chest_number - 珍贵宝箱数量
   * @property {number} luxurious_chest_number - 豪华宝箱数量
   * @property {number} exquisite_chest_number - 精致宝箱数量
   * @property {number} common_chest_number - 普通宝箱数量
   * @property {number} electroculus_number - 雷神瞳数量
   * @property {number} magic_chest_number - 奇馈宝箱数量
   * @property {number} dendroculus_number - 草神瞳数量
   * @property {number} hydroculus_number - 水神瞳数量
   * @property {number} pyroculus_number - 火神瞳数量
   * @property {unknown} field_ext_map - 数据对应链接的map，用不到设为 unknown
   * @property {CombatStats} role_combat - 幻想真境剧诗数据
   * @property {number} full_fetter_avatar_num - 满好感角色数
   * @property {ChallengeStats} hard_challenge - 幽境危战挑战数据
   */
  type Stats = {
    active_day_number: number;
    achievement_number: number;
    anemoculus_number: number;
    geoculus_number: number;
    avatar_number: number;
    way_point_number: number;
    domain_number: number;
    spiral_abyss: string;
    precious_chest_number: number;
    luxurious_chest_number: number;
    exquisite_chest_number: number;
    common_chest_number: number;
    electroculus_number: number;
    magic_chest_number: number;
    dendroculus_number: number;
    hydroculus_number: number;
    pyroculus_number: number;
    field_ext_map: unknown;
    role_combat: CombatStats;
    full_fetter_avatar_num: number;
    hard_challenge: ChallengeStats;
  };

  /**
   * @description 幻想真境剧诗数据类型
   * @interface CombatStats
   * @since Beta v0.5.0
   * @property {boolean} is_unlock - 是否解锁
   * @property {number} max_round_id - 最大报幕数
   * @property {boolean} has_data - 是否有数据
   * @property {boolean} has_detail_data - 是否有详细数据
   * @return CombatStats
   */
  type CombatStats = {
    is_unlock: boolean;
    max_round_id: number;
    has_data: boolean;
    has_detail_data: boolean;
  };

  /**
   * @description 幽境危战挑战数据类型
   * @interface ChallengeStats
   * @since Beta v0.8.0
   * @property {boolean} is_unlock - 是否解锁
   * @property {number} difficulty - 挑战难度
   * @property {boolean} has_data - 是否有数据
   * @property {string} name - 挑战名称
   */
  type ChallengeStats = {
    is_unlock: boolean;
    difficulty: number;
    has_data: boolean;
    name: string;
  };

  /**
   * @description 世界探索信息类型
   * @interface WorldExplore
   * @since Beta 0.7.2
   * @property {number} level - 声望等级
   * @property {number} exploration_percentage - 探索千分比
   * @property {string} icon - 图标
   * @property {string} name - 名称
   * @property {string} type - 类型 // Reputation: 声望,Offering: 奉献
   * @property {WorldOffering[]} offerings - 奉献物品
   * @property {number} id - ID
   * @property {number} parent_id - 父级 ID
   * @property {string} map_url - 地图 URL
   * @property {string} strategy_url - 攻略 URL
   * @property {string} background_image - 背景图片 URL
   * @property {string} inner_icon - 内部图标 URL
   * @property {string} cover - 封面 URL
   * @property {Array<unknown>} area_exploration_list - 区域探索列表
   * @property {Array<unknown>} boss_list - Boss 列表
   * @property {boolean} is_hot - 是否热门
   * @property {boolean} index_active - 索引激活
   * @property {boolean} detail_active - 详细激活
   * @property {number} seven_status_level - 七天神像等级
   * @property {NataReputation[] | null} nata_reputation - 纳塔声望
   * @property {number} world_type - 世界类型
   * @return WorldExplore
   */
  type WorldExplore = {
    level: number;
    exploration_percentage: number;
    icon: string;
    name: string;
    type: string;
    offerings: Array<WorldOffering>;
    id: number;
    parent_id: number;
    map_url: string;
    strategy_url: string;
    background_image: string;
    inner_icon: string;
    cover: string;
    area_exploration_list: Array<unknown>;
    boss_list: Array<unknown>;
    is_hot: boolean;
    index_active: boolean;
    detail_active: boolean;
    seven_status_level: number;
    nata_reputation: NataReputation | null;
    world_type: number;
  };

  /**
   * @description 奉献物品类型
   * @interface WorldOffering
   * @since Alpha v0.2.0
   * @property {string} name - 名称
   * @property {number} level - 等级
   * @property {string} icon - 图标
   * @return WorldOffering
   */
  type WorldOffering = { name: string; level: number; icon: string };

  /**
   * @description 纳塔声望类型
   * @interface NataReputation
   * @since Beta v0.7.2
   * @property {Array<NataOffering>} tribal_list - 部落列表
   * @returns NataReputation
   */
  type NataReputation = { tribal_list: Array<NataOffering> };

  /**
   * @description 部落列表类型
   * @interface NataOffering
   * @extends WorldOffering
   * @property {number} id - ID
   * @property {string} image - 图片
   * @returns NataOffering
   */
  type NataOffering = WorldOffering & { id: number; image: string };

  /**
   * @description 尘歌壶信息类型
   * @interface Home
   * @since Alpha v0.2.0
   * @property {number} level - 等级
   * @property {number} visit_num - 访问次数
   * @property {number} comfort_num - 最高洞天仙力
   * @property {number} item_num - 获得摆设数
   * @property {number} name - 名称
   * @property {string} icon - 图标
   * @property {string} comfort_level_name - 洞天仙力等级名称
   * @property {string} comfort_level_icon - 洞天仙力等级图标
   * @return Home
   */
  type Home = {
    level: number;
    visit_num: number;
    comfort_num: number;
    item_num: number;
    name: string;
    icon: string;
    comfort_level_name: string;
    comfort_level_icon: string;
  };
}
