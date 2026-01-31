/**
 * 游戏角色详情相关类型定义文件
 * @since Beta v0.9.5
 */

declare namespace TGApp.Game.Avatar {
  /**
   * 角色列表数据返回响应
   * @since Beta v0.5.3
   */
  type ListResp = TGApp.BBS.Response.BaseWithData<ListRes>;

  /**
   * 角色列表数据返回
   * @since Beta v0.9.1
   */
  type ListRes = {
    /** 角色列表 */
    list: Array<Avatar>;
  };

  /**
   * 角色详情数据返回响应
   * @since Beta v0.5.3
   */
  type DetailResp = TGApp.BBS.Response.BaseWithData<DetailRes>;

  /**
   * 角色列表数据类型
   * @since Beta v0.5.3
   */
  type Avatar = {
    /** 角色已激活命座数量 */
    actived_constellation_num: number;
    /** 角色元素 */
    element: string;
    /** 角色好感等级 */
    fetter: number;
    /** 角色头像 */
    icon: string;
    /** 角色 ID */
    id: number;
    /** 角色全身像 */
    image: string;
    /** 是否选中作为展示 */
    is_chosen: boolean;
    /** 角色等级 */
    level: number;
    /** 角色名称 */
    name: string;
    /** 角色稀有度 */
    rarity: number;
    /** 角色侧边头像 */
    side_icon: string;
    /** 角色武器 */
    weapon: Weapon;
    /** 角色武器类型 */
    weapon_type: number;
  };

  /**
   * 角色武器数据类型
   * @since Beta v0.5.3
   */
  type Weapon = {
    /** 武器精炼等级 */
    affix_level: number;
    /** 武器图标 */
    icon: string;
    /** 武器 ID */
    id: number;
    /** 武器等级 */
    level: number;
    /** 武器稀有度 */
    rarity: number;
    /** 武器类型，与 weapon_type 一致 */
    type: number;
  };

  /**
   * 角色详情数据类型
   * @since Beta v0.5.3
   */
  type DetailRes = {
    /** 角色详情列表 */
    list: Array<AvatarDetail>;
    /** 角色属性映射 */
    property_map: PropMap;
    /** 圣遗物属性选项 */
    relic_property_options: PropRecommend;
    /** 圣遗物属性对应的百科 */
    relic_wiki: Record<string, string>;
    /** 武器属性对应的百科 */
    weapon_wiki: Record<string, string>;
    /** 角色属性对应的百科 */
    avatar_wiki: Record<string, string>;
  };

  /**
   * 角色详情列表数据类型
   * @since Beta v0.5.3
   */
  type AvatarDetail = {
    /** 角色基础信息 */
    base: Avatar;
    /** 角色武器信息 */
    weapon: WeaponDetail;
    /** 角色圣遗物信息 */
    relics: Array<Relic>;
    /** 角色命座信息 */
    constellations: Array<Constellation>;
    /** 角色时装信息 */
    costumes: Array<Costume>;
    /** 角色选中属性 */
    selected_properties: Array<Prop>;
    /** 角色基础属性 */
    base_properties: Array<Prop>;
    /** 角色额外属性 */
    extra_properties: Array<Prop>;
    /** 角色元素属性 */
    element_properties: Array<Prop>;
    /** 角色技能信息 */
    skills: Array<Skill>;
    /** 推荐圣遗物属性 */
    recommend_relic_property: RelicRecommendProp;
  };

  /**
   * 角色详情武器数据类型
   * @since Beta v0.9.5
   */
  type WeaponDetail = {
    /** 武器 ID */
    id: number;
    /** 武器名称 */
    name: string;
    /** 武器图标 */
    icon: string;
    /** 武器类型 */
    type: number;
    /** 武器稀有度 */
    rarity: number;
    /** 武器等级 */
    level: number;
    /** 武器突破等级 */
    promote_level: number;
    /** 武器类型名称 */
    type_name: string;
    /** 武器描述 */
    desc: string;
    /** 武器精炼等级 */
    affix_level: number;
    /** 武器主属性 */
    main_property: Prop;
    /** 武器副属性 */
    sub_property?: Prop;
  };

  /**
   * 角色属性数据类型
   * @since Beta v0.5.3
   */
  type Prop = {
    /** 属性类型 */
    property_type: number;
    /** 基础属性 */
    base: string;
    /** 附加属性 */
    add: string;
    /** 最终属性 */
    final: string;
  };

  /**
   * 角色圣遗物数据类型
   * @since Beta v0.5.3
   */
  type Relic = {
    /** 圣遗物 ID */
    id: number;
    /** 圣遗物名称 */
    name: string;
    /** 圣遗物图标 */
    icon: string;
    /** 圣遗物位置 */
    pos: number;
    /** 圣遗物稀有度 */
    rarity: number;
    /** 圣遗物等级 */
    level: number;
    /** 圣遗物套装 */
    set: RelicSet;
    /** 圣遗物位置名称 */
    pos_name: string;
    /** 圣遗物主属性 */
    main_property: RelicProp;
    /** 圣遗物副属性 */
    sub_property_list: Array<RelicProp>;
  };

  /**
   * 圣遗物套装数据类型
   * @since Beta v0.5.3
   */
  type RelicSet = {
    /** 圣遗物套装 ID */
    id: number;
    /** 圣遗物套装名称 */
    name: string;
    /** 圣遗物套装效果 */
    affixes: Array<RelicSetAffix>;
  };

  /**
   * 圣遗物套装效果数据类型
   * @since Beta v0.5.3
   */
  type RelicSetAffix = {
    /** 圣遗物套装激活数量 */
    activation_number: number;
    /** 圣遗物套装效果 */
    effect: string;
  };

  /**
   * 圣遗物属性数据类型
   * @since Beta v0.5.3
   */
  type RelicProp = {
    /** 属性类型 */
    property_type: number;
    /** 属性值 */
    value: string;
    /** 强化次数 */
    times: number;
  };

  /**
   * 命座数据类型
   * @since Beta v0.5.3
   */
  type Constellation = {
    /** 命座 ID */
    id: number;
    /** 命座名称 */
    name: string;
    /** 命座图标 */
    icon: string;
    /** 命座效果 */
    effect: string;
    /** 命座是否激活 */
    is_actived: boolean;
    /** 命座位置 */
    pos: number;
  };

  /**
   * 时装数据类型
   * @since Beta v0.5.3
   */
  type Costume = {
    /** 时装 ID */
    id: number;
    /** 时装名称 */
    name: string;
    /** 时装图标 */
    icon: string;
  };

  /**
   * 技能数据类型
   * @since Beta v0.5.3
   */
  type Skill = {
    /** 技能 ID */
    skill_id: number;
    /** 技能类型 */
    skill_type: number;
    /** 技能等级 */
    level: number;
    /** 技能描述 */
    desc: string;
    /** 技能效果 */
    skill_affix_list: Array<SkillAffix>;
    /** 技能图标 */
    icon: string;
    /** 技能是否解锁 */
    is_unlock: boolean;
    /** 技能名称 */
    name: string;
  };

  /**
   * 技能效果数据类型
   * @since Beta v0.5.3
   */
  type SkillAffix = {
    /** 效果名称 */
    name: string;
    /** 效果值 */
    value: string;
  };

  /**
   * 推荐圣遗物属性数据类型
   * @since Beta v0.5.3
   */
  type RelicRecommendProp = {
    /** 推荐属性 */
    recommend_properties: PropRecommend;
    /** 自定义属性 */
    custom_properties: PropRecommend | null;
    /** 是否有套装推荐属性 */
    has_set_recommend_prop: boolean;
  };

  /**
   * 推荐属性数据类型
   * @since Beta v0.5.3
   */
  type PropRecommend = {
    /** 推荐主属性列表（沙漏） */
    sand_main_property_list: Array<number>;
    /** 推荐主属性列表（圣杯） */
    goblet_main_property_list: Array<number>;
    /** 推荐主属性列表（头冠） */
    circlet_main_property_list: Array<number>;
    /** 推荐副属性列表 */
    sub_property_list: Array<number>;
  };

  /**
   * 角色属性映射数据类型
   * @since Beta v0.5.3
   */
  type PropMap = Record<string, PropMapItem>;

  /**
   * 角色属性映射项数据类型
   * @since Beta v0.5.3
   */
  type PropMapItem = {
    /** 属性类型，与 key 一致 */
    property_type: number;
    /** 属性名称 */
    name: string;
    /** 属性图标 */
    icon: string;
    /** 属性过滤名称 */
    filter_name: string;
  };
}
