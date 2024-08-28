/**
 * @file types/Game/Record.d.ts
 * @description 原神战绩相关类型定义文件
 * @since Beta v0.5.5
 */

/**
 * @description 原神战绩相关类型定义命名空间
 * @since Beta v0.5.5
 * @namespace TGApp.Game.Record
 * @memberof TGApp.Game
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
  interface Response extends TGApp.BBS.Response.BaseWithData {
    data: FullData;
  }

  /**
   * @description 原神战绩数据类型
   * @interface FullData
   * @since Alpha v0.2.0
   * @property {Role} role - 角色信息
   * @property {Avatar[]} avatars - 角色列表
   * @property {Stats} stats - 统计信息
   * @property {unknown[]} city_explorations - 城市探索信息
   * @property {WorldExplore[]} world_explorations - 世界探索信息
   * @property {Home[]} homes - 尘歌壶信息
   * @return FullData
   */
  interface FullData {
    role: Role;
    avatars: Avatar[];
    stats: Stats;
    city_explorations: unknown[];
    world_explorations: WorldExplore[];
    homes: Home[];
  }

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
  interface Role {
    AvatarUrl: string;
    nickname: string;
    region: string;
    level: number;
    game_head_icon: string;
  }

  /**
   * @description 角色列表类型
   * @interface Avatar
   * @since Alpha v0.2.0
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
   * @return Avatar
   */
  interface Avatar {
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
  }

  /**
   * @description 统计信息类型
   * @interface Stats
   * @since Beta v0.5.5
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
   * @return Stats
   */
  interface Stats {
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
  }

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
  interface CombatStats {
    is_unlock: boolean;
    max_round_id: number;
    has_data: boolean;
    has_detail_data: boolean;
  }

  /**
   * @description 世界探索信息类型
   * @interface WorldExplore
   * @since Alpha v0.2.0
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
   * @return WorldExplore
   */
  interface WorldExplore {
    level: number;
    exploration_percentage: number;
    icon: string;
    name: string;
    type: string;
    offerings: WorldOffering[];
    id: number;
    parent_id: number;
    map_url: string;
    strategy_url: string;
    background_image: string;
    inner_icon: string;
    cover: string;
  }

  /**
   * @description 奉献物品类型
   * @interface WorldOffering
   * @since Alpha v0.2.0
   * @property {string} name - 名称
   * @property {number} level - 等级
   * @property {string} icon - 图标
   * @return WorldOffering
   */
  interface WorldOffering {
    name: string;
    level: number;
    icon: string;
  }

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
  interface Home {
    level: number;
    visit_num: number;
    comfort_num: number;
    item_num: number;
    name: string;
    icon: string;
    comfort_level_name: string;
    comfort_level_icon: string;
  }
}
