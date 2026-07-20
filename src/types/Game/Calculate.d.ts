/**
 * 养成计算器相关类型定义文件
 * @since Beta v0.11.2
 */

declare namespace TGApp.Game.Calculate {
  /**
   * 批量养成计算请求参数
   * @since Beta v0.11.2
   */
  type Params = {
    /** 待计算项目列表 */
    items: Array<ParamsItem>;
    /** 请求语言 */
    lang: string;
    /** 游戏服务器 */
    region: TGApp.Game.Base.ServerTypeEnum;
    /** 游戏 UID */
    uid: string;
  };

  /**
   * 全部角色列表请求参数
   * @since Beta v0.11.1
   */
  type AvatarListParams = {
    /** 元素属性 ID 筛选列表 */
    element_attr_ids: Array<number>;
    /** 是否返回全部角色 */
    is_all: boolean;
    /** 返回数据语言 */
    lang: string;
    /** 页码 */
    page: number;
    /** 每页数量 */
    size: number;
    /** 武器类型 ID 筛选列表 */
    weapon_cat_ids: Array<number>;
  };

  /**
   * 全部武器列表请求参数
   * @since Beta v0.11.1
   */
  type WeaponListParams = {
    /** 返回数据语言 */
    lang: string;
    /** 页码 */
    page: number;
    /** 每页数量 */
    size: number;
    /** 武器类型 ID 筛选列表 */
    weapon_cat_ids: Array<number>;
    /** 武器稀有度筛选列表 */
    weapon_levels: Array<number>;
  };

  /**
   * 全部角色列表响应
   * @since Beta v0.11.1
   */
  type AvatarListResp = TGApp.BBS.Response.BaseWithData<AvatarListResult>;

  /**
   * 全部角色列表结果
   * @since Beta v0.11.1
   */
  type AvatarListResult = {
    /** 角色列表 */
    list: Array<AvatarListItem>;
    /** 角色总数 */
    total: number;
  };

  /**
   * 全部角色列表项
   * @since Beta v0.11.1
   */
  type AvatarListItem = {
    /** 角色 ID */
    id: number;
    /** 角色名称 */
    name: string;
    /** 角色图标 */
    icon: string;
    /** 角色使用的武器类型 ID */
    weapon_cat_id: number;
    /** 角色稀有度 */
    avatar_level: number;
    /** 元素属性 ID */
    element_attr_id: number;
    /** 最高等级 */
    max_level: number;
    /** 技能列表 */
    skill_list: Array<AvatarListSkill>;
    /** 角色 Wiki 地址 */
    wiki_url: string;
    /** 推荐武器 Wiki 地址 */
    wiki_recommend_weapon_url: string;
  };

  /**
   * 全部角色技能列表项
   * @since Beta v0.11.1
   */
  type AvatarListSkill = {
    /** 技能 ID */
    id: number;
    /** 技能组 ID */
    group_id: number;
    /** 技能名称 */
    name: string;
    /** 技能图标 */
    icon: string;
    /** 技能最高等级 */
    max_level: number;
    /** 是否为固有天赋 */
    is_proud: boolean;
    /** 技能位置名称 */
    pos_name: string;
  };

  /**
   * 全部武器列表响应
   * @since Beta v0.11.1
   */
  type WeaponListResp = TGApp.BBS.Response.BaseWithData<WeaponListResult>;

  /**
   * 全部武器列表结果
   * @since Beta v0.11.1
   */
  type WeaponListResult = {
    /** 武器列表 */
    list: Array<WeaponListItem>;
    /** 武器总数 */
    total: number;
  };

  /**
   * 全部武器列表项
   * @since Beta v0.11.1
   */
  type WeaponListItem = {
    /** 武器 ID */
    id: number;
    /** 武器名称 */
    name: string;
    /** 武器图标 */
    icon: string;
    /** 武器类型 ID */
    weapon_cat_id: number;
    /** 武器稀有度 */
    weapon_level: number;
    /** 最高等级 */
    max_level: number;
    /** 是否为推荐武器 */
    is_recommend: boolean;
    /** 武器 Wiki 地址 */
    wiki_url: string;
  };

  /**
   * 同步角色列表请求参数
   * @since Beta v0.11.2
   */
  type SyncAvatarParams = {
    /** 元素属性 ID 筛选列表 */
    element_attr_ids: Array<number>;
    /** 返回数据语言 */
    lang: string;
    /** 页码 */
    page: number;
    /** 游戏服务器 */
    region: TGApp.Game.Base.ServerTypeEnum;
    /** 每页数量 */
    size: number;
    /** 游戏 UID */
    uid: string;
    /** 武器类型 ID 筛选列表 */
    weapon_cat_ids: Array<number>;
  };

  /**
   * 同步角色列表响应
   * @since Beta v0.11.2
   */
  type SyncAvatarResp = TGApp.BBS.Response.BaseWithData<SyncAvatarResult>;

  /**
   * 同步角色列表结果
   * @since Beta v0.11.2
   */
  type SyncAvatarResult = {
    /** 角色列表 */
    list: Array<SyncAvatar>;
    /** 角色总数 */
    total: number;
  };

  /**
   * 同步角色信息
   * @since Beta v0.11.2
   */
  type SyncAvatar = {
    /** 角色 ID */
    id: number;
    /** 角色名称 */
    name: string;
    /** 角色图标 */
    icon: string;
    /** 角色使用的武器类型 ID */
    weapon_cat_id: number;
    /** 角色稀有度 */
    avatar_level: number;
    /** 元素属性 ID */
    element_attr_id: number;
    /** 最高等级 */
    max_level: number;
    /** 当前等级 */
    level_current: number;
    /** 当前突破等级 */
    promote_level: number;
    /** 技能列表 */
    skill_list: Array<SyncAvatarSkill>;
    /** 当前装备武器 */
    weapon: SyncAvatarWeapon;
    /** 当前装备圣遗物列表 */
    reliquary_list: Array<SyncAvatarReliquary>;
    /** 角色 Wiki 地址 */
    wiki_url: string;
    /** 推荐武器 Wiki 地址 */
    wiki_recommend_weapon_url: string;
    /** 已激活命座数 */
    constellation_num: number;
    /** 好感等级 */
    fetter_level: number;
  };

  /**
   * 同步角色技能
   * @since Beta v0.11.2
   */
  type SyncAvatarSkill = {
    /** 技能 ID */
    id: number;
    /** 技能组 ID */
    group_id: number;
    /** 技能名称 */
    name: string;
    /** 技能图标 */
    icon: string;
    /** 技能最高等级 */
    max_level: number;
    /** 技能当前等级 */
    level_current: number;
  };

  /**
   * 同步角色武器
   * @since Beta v0.11.2
   */
  type SyncAvatarWeapon = {
    /** 武器 ID */
    id: number;
    /** 武器名称 */
    name: string;
    /** 武器图标 */
    icon: string;
    /** 武器类型 ID */
    weapon_cat_id: number;
    /** 武器稀有度 */
    weapon_level: number;
    /** 武器最高等级 */
    max_level: number;
    /** 武器当前等级 */
    level_current: number;
  };

  /**
   * 同步角色圣遗物
   * @since Beta v0.11.2
   */
  type SyncAvatarReliquary = {
    /** 圣遗物 ID */
    id: number;
    /** 圣遗物名称 */
    name: string;
    /** 圣遗物图标 */
    icon: string;
    /** 圣遗物部位 ID */
    reliquary_cat_id: number;
    /** 圣遗物稀有度 */
    reliquary_level: number;
    /** 圣遗物当前等级 */
    level_current: number;
    /** 圣遗物最高等级 */
    max_level: number;
  };

  /**
   * 待计算项目
   * @since Beta v0.11.2
   */
  type ParamsItem = AvatarParamsItem | WeaponParamsItem;

  /**
   * 待计算角色项目
   * @since Beta v0.11.1
   */
  type AvatarParamsItem = {
    /** 角色 ID */
    avatar_id: number;
    /** 角色当前等级 */
    avatar_level_current: number;
    /** 角色目标等级 */
    avatar_level_target: number;
    /** 角色元素属性 ID */
    element_attr_id: number;
    /** 技能等级目标列表 */
    skill_list: Array<SkillTarget>;
    /** 武器等级目标，未选择武器时为 null */
    weapon: WeaponTarget | null;
    /** 是否同步用户背包数据 */
    from_user_sync: boolean;
    /** 角色当前突破等级 */
    avatar_promote_level?: number;
  };

  /**
   * 待计算纯武器项目
   * @since Beta v0.11.1
   */
  type WeaponParamsItem = {
    /** 武器等级目标 */
    weapon: WeaponTarget;
  };

  /**
   * 技能等级目标
   * @since Beta v0.11.2
   */
  type SkillTarget = {
    /** 技能 ID */
    id: number;
    /** 当前等级 */
    level_current: number;
    /** 目标等级 */
    level_target: number;
  };

  /**
   * 武器等级目标
   * @since Beta v0.11.2
   */
  type WeaponTarget = {
    /** 武器 ID */
    id: number;
    /** 武器名称 */
    name: string;
    /** 武器图标 */
    icon?: string;
    /** 武器类型 ID */
    weapon_cat_id?: number;
    /** 武器稀有度 */
    weapon_level?: number;
    /** 武器最高等级 */
    max_level?: number;
    /** 当前等级 */
    level_current: number;
    /** 目标等级 */
    level_target: number;
  };

  /**
   * 批量养成计算响应
   * @since Beta v0.11.2
   */
  type Resp = TGApp.BBS.Response.BaseWithData<Result>;

  /**
   * 养成计算结果
   * @since Beta v0.11.2
   */
  type Result = {
    /** 各项目的材料计算结果 */
    items: Array<ItemResult>;
    /** 用户当前可用材料 */
    available_material: Array<Material>;
    /** 全部项目合计消耗 */
    overall_consume: Array<Material>;
    /** 按来源分类的合计消耗 */
    overall_material_consume: OverallMaterialConsume;
    /** 大地图跳转地址 */
    jump_url: string;
    /** 单个项目的计算结果 */
    single_role_result: Array<Result>;
    /** 是否包含用户背包信息 */
    has_user_info: boolean;
  };

  /**
   * 单个项目的材料计算结果
   * @since Beta v0.11.2
   */
  type ItemResult = {
    /** 角色等级材料 */
    avatar_consume: Array<Material>;
    /** 角色技能材料合计 */
    avatar_skill_consume: Array<Material>;
    /** 武器材料 */
    weapon_consume: Array<Material>;
    /** 圣遗物材料 */
    reliquary_consume: Array<Material>;
    /** 按技能分类的材料 */
    skills_consume: Array<SkillConsume>;
    /** 技能材料秘境日历 */
    calendar: DungeonCalendar;
    /** 队伍推荐地址 */
    lineup_recommend: string;
  };

  /**
   * 材料条目
   * @since Beta v0.11.2
   */
  type Material = {
    /** 材料 ID */
    id: number;
    /** 材料名称 */
    name: string;
    /** 材料图标 */
    icon: string;
    /** 所需数量 */
    num: number;
    /** 材料 Wiki 地址 */
    wiki_url: string;
    /** 材料稀有度 */
    level: number;
    /** 材料图标地址 */
    icon_url: string;
    /** 缺少数量 */
    lack_num: number;
  };

  /**
   * 单个技能的材料消耗
   * @since Beta v0.11.2
   */
  type SkillConsume = {
    /** 材料列表 */
    consume_list: Array<Material>;
    /** 技能等级信息 */
    skill_info: SkillInfo;
  };

  /**
   * 技能等级信息
   * @since Beta v0.11.2
   */
  type SkillInfo = {
    /** 技能 ID */
    id: string;
    /** 当前等级 */
    level_current: string;
    /** 目标等级 */
    level_target: string;
  };

  /**
   * 秘境日历
   * @since Beta v0.11.2
   */
  type DungeonCalendar = {
    /** 秘境名称 */
    dungeon_name: string;
    /** 掉落星期列表 */
    drop_day: Array<string>;
    /** 秘境 Wiki 地址 */
    calendar_link: string;
    /** 是否包含日历数据 */
    has_data: boolean;
  };

  /**
   * 按来源分类的合计消耗
   * @since Beta v0.11.2
   */
  type OverallMaterialConsume = {
    /** 角色等级材料来源 */
    avatar_consume: Array<MaterialGroup>;
    /** 角色技能材料来源 */
    avatar_skill_consume: Array<MaterialGroup>;
    /** 武器材料来源 */
    weapon_consume: Array<MaterialGroup>;
  };

  /**
   * 材料来源分组
   * @since Beta v0.11.2
   */
  type MaterialGroup = {
    /** 材料列表 */
    consume: Array<Material>;
    /** 使用材料的角色列表 */
    avatars: Array<AvatarRef>;
    /** 使用材料的武器列表 */
    weapons: Array<WeaponRef>;
    /** 材料来源类型 */
    material_source: string;
    /** 对应怪物信息 */
    monster?: Monster;
    /** 大地图地址 */
    map_url?: string;
    /** 对应秘境日历 */
    dungeon_calendar?: DungeonCalendar;
  };

  /**
   * 材料关联角色
   * @since Beta v0.11.2
   */
  type AvatarRef = {
    /** 角色 ID */
    id: number;
    /** 角色图标 */
    icon: string;
    /** 角色突破等级 */
    avatar_level: number;
  };

  /**
   * 材料关联武器
   * @since Beta v0.11.2
   */
  type WeaponRef = {
    /** 武器 ID */
    id: number;
    /** 武器图标 */
    icon: string;
    /** 武器稀有度 */
    weapon_level: number;
  };

  /**
   * 怪物信息
   * @since Beta v0.11.2
   */
  type Monster = {
    /** 怪物 ID */
    monster_id: string;
    /** 怪物名称 */
    monster_name: string;
    /** 怪物图标 */
    monster_icon: string;
    /** 怪物地图地址 */
    monster_map_url: string;
  };
}
