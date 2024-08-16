/**
 * @file types/Game/Avatar.d.ts
 * @description 游戏角色详情相关类型定义文件
 * @since Beta v0.5.3
 */

/**
 * @description 游戏角色详情相关类型定义命名空间
 * @since Beta v0.5.3
 * @namespace TGApp.Game.Avatar
 * @memberof TGApp.Game
 */
declare namespace TGApp.Game.Avatar {
  /**
   * @description 角色列表数据返回类型
   * @interface ListResponse
   * @since Beta v0.5.3
   * @extends TGApp.BBS.Response.BaseWithData
   * @property {Avatar[]} data.list - 角色列表
   * @return ListResponse
   */
  interface ListResponse extends TGApp.BBS.Response.BaseWithData {
    data: {
      list: Avatar[];
    };
  }

  /**
   * @description 角色详情数据返回类型
   * @interface DetailResponse
   * @since Beta v0.5.3
   * @extends TGApp.BBS.Response.BaseWithData
   * @property {AvatarDetail} data - 角色详情
   * @return DetailResponse
   */
  interface DetailResponse extends TGApp.BBS.Response.BaseWithData {
    data: AvatarDetail;
  }

  /**
   * @description 角色列表数据类型
   * @interface Avatar
   * @since Beta v0.5.3
   * @property {number} actived_constellation_num - 角色已激活命座数量
   * @property {string} element - 角色元素
   * @property {number} fetter - 角色好感等级
   * @property {string} icon - 角色头像
   * @property {number} id - 角色 ID
   * @property {string} image - 角色全身像
   * @property {boolean} is_chosen - 是否选中作为展示
   * @property {number} level - 角色等级
   * @property {string} name - 角色名称
   * @property {number} rarity - 角色稀有度
   * @property {string} side_icon - 角色侧边头像
   * @property {Weapon} weapon - 角色武器
   * @property {number} weapon_type - 角色武器类型
   * @return Avatar
   */
  interface Avatar {
    actived_constellation_num: number;
    element: string;
    fetter: number;
    icon: string;
    id: number;
    image: string;
    is_chosen: boolean;
    level: number;
    name: string;
    rarity: number;
    side_icon: string;
    weapon: Weapon;
    weapon_type: number;
  }

  /**
   * @description 角色武器数据类型
   * @interface Weapon
   * @since Beta v0.5.3
   * @property {number} affix_level - 武器精炼等级
   * @property {string} icon - 武器图标
   * @property {number} id - 武器 ID
   * @property {number} level - 武器等级
   * @property {number} rarity - 武器稀有度
   * @property {number} type - 武器类型，与上面的 weapon_type 一致
   * @return Weapon
   */
  interface Weapon {
    affix_level: number;
    icon: string;
    id: number;
    level: number;
    rarity: number;
    type: number;
  }

  /**
   * @description 角色详情数据类型
   * @interface AvatarDetail
   * @since Beta v0.5.3
   * @property {DetailList[]} list - 角色详情列表
   * @property {PropMap} property_map - 角色属性映射
   * @property {PropRecommend} relic_property_options - 圣遗物属性选项
   * @property {Record<string, string>} relic_wiki - 圣遗物属性对应的百科
   * @property {Record<string, string>} weapon_wiki - 武器属性对应的百科
   * @property {Record<string, string>} avatar_wiki - 角色属性对应的百科
   * @return AvatarDetail
   */
  interface AvatarDetail {
    list: DetailList[];
    property_map: PropMap;
    relic_property_options: PropRecommend;
    relic_wiki: Record<string, string>;
    weapon_wiki: Record<string, string>;
    avatar_wiki: Record<string, string>;
  }

  /**
   * @description 角色详情列表数据类型
   * @interface DetailList
   * @since Beta v0.5.3
   * @property {Avatar} base - 角色基础信息
   * @property {WeaponDetail} weapon - 角色武器信息
   * @property {Relic[]} relics - 角色圣遗物信息
   * @property {Constellation[]} constellations - 角色命座信息
   * @property {Costume[]} costumes - 角色时装信息
   * @property {Prop[]} selected_properties - 角色选中属性
   * @property {Prop[]} base_properties - 角色基础属性
   * @property {Prop[]} extra_properties - 角色额外属性
   * @property {Prop[]} element_properties - 角色元素属性
   * @property {Skill[]} skills - 角色技能信息
   * @property {RelicRecommendProp} recommend_relic_property - 推荐圣遗物属性
   * @return DetailList
   */
  interface DetailList {
    base: Avatar;
    weapon: WeaponDetail;
    relics: Relic[];
    constellations: Constellation[];
    costumes: Costume[];
    selected_properties: Prop[];
    base_properties: Prop[];
    extra_properties: Prop[];
    element_properties: Prop[];
    skills: Skill[];
    recommend_relic_property: RelicRecommendProp;
  }

  /**
   * @description 角色详情武器数据类型
   * @interface WeaponDetail
   * @since Beta v0.5.3
   * @property {number} id - 武器 ID
   * @property {string} name - 武器名称
   * @property {string} icon - 武器图标
   * @property {number} type - 武器类型
   * @property {number} rarity - 武器稀有度
   * @property {number} level - 武器等级
   * @property {number} promote_level - 武器突破等级
   * @property {string} type_name - 武器类型名称
   * @property {string} desc - 武器描述
   * @property {number} affix_level - 武器精炼等级
   * @property {Prop} main_property - 武器主属性
   * @property {Prop} sub_property - 武器副属性
   * @return WeaponDetail
   */
  interface WeaponDetail {
    id: number;
    name: string;
    icon: string;
    type: number;
    rarity: number;
    level: number;
    promote_level: number;
    type_name: string;
    desc: string;
    affix_level: number;
    main_property: Prop;
    sub_property: Prop;
  }

  /**
   * @description 角色详情武器属性数据类型
   * @interface Prop
   * @since Beta v0.5.3
   * @property {number} property_type - 属性类型
   * @property {string} base - 基础属性
   * @property {string} add - 附加属性
   * @property {string} final - 最终属性
   * @return Prop
   */
  interface Prop {
    property_type: number;
    base: string;
    add: string;
    final: string;
  }

  /**
   * @description 角色详情圣遗物数据类型
   * @interface Relic
   * @since Beta v0.5.3
   * @property {number} id - 圣遗物 ID
   * @property {string} name - 圣遗物名称
   * @property {string} icon - 圣遗物图标
   * @property {number} pos - 圣遗物位置
   * @property {number} rarity - 圣遗物稀有度
   * @property {number} level - 圣遗物等级
   * @property {RelicSet} set - 圣遗物套装
   * @property {string} pos_name - 圣遗物位置名称
   * @property {RelicProp} main_property - 圣遗物主属性
   * @property {RelicProp[]} sub_properties - 圣遗物副属性
   * @return Relic
   */
  interface Relic {
    id: number;
    name: string;
    icon: string;
    pos: number;
    rarity: number;
    level: number;
    set: RelicSet;
    pos_name: string;
    main_property: RelicProp;
    sub_properties: RelicProp[];
  }

  /**
   * @description 圣遗物套装数据类型
   * @interface RelicSet
   * @since Beta v0.5.3
   * @property {number} id - 圣遗物套装 ID
   * @property {string} name - 圣遗物套装名称
   * @property {RelicSetAffix[]} affixes - 圣遗物套装效果
   * @return RelicSet
   */
  interface RelicSet {
    id: number;
    name: string;
    affixes: RelicSetAffix[];
  }

  /**
   * @description 圣遗物套装效果数据类型
   * @interface RelicSetAffix
   * @since Beta v0.5.3
   * @property {number} activation_number - 圣遗物套装激活数量
   * @property {string} effect - 圣遗物套装效果
   * @return RelicSetAffix
   */
  interface RelicSetAffix {
    activation_number: number;
    effect: string;
  }

  /**
   * @description 圣遗物属性数据类型
   * @interface RelicProp
   * @since Beta v0.5.3
   * @property {number} property_type - 属性类型
   * @property {string} value - 属性值
   * @property {number} times - 强化次数
   * @return RelicProp
   */
  interface RelicProp {
    property_type: number;
    value: string;
    times: number;
  }

  /**
   * @description 角色详情命座数据类型
   * @interface Constellation
   * @since Beta v0.5.3
   * @property {number} id - 命座 ID
   * @property {string} name - 命座名称
   * @property {string} icon - 命座图标
   * @property {string} effect - 命座效果
   * @property {boolean} is_actived - 命座是否激活
   * @property {number} pos - 命座位置
   * @return Constellation
   */
  interface Constellation {
    id: number;
    name: string;
    icon: string;
    effect: string;
    is_actived: boolean;
    pos: number;
  }

  /**
   * @description 角色详情时装数据类型
   * @interface Costume
   * @since Beta v0.5.3
   * @property {number} id - 时装 ID
   * @property {string} name - 时装名称
   * @property {string} icon - 时装图标
   * @return Costume
   */
  interface Costume {
    id: number;
    name: string;
    icon: string;
  }

  /**
   * @description 角色详情技能数据类型
   * @interface Skill
   * @since Beta v0.5.3
   * @property {number} skill_id - 技能 ID
   * @property {number} skill_type - 技能类型
   * @property {number} level - 技能等级
   * @property {string} desc - 技能描述
   * @property {SkillAffix[]} skill_affix_list - 技能效果
   * @property {string} icon - 技能图标
   * @property {boolean} is_unlock - 技能是否解锁
   * @property {string} name - 技能名称
   * @return Skill
   */
  interface Skill {
    skill_id: number;
    skill_type: number;
    level: number;
    desc: string;
    skill_affix_list: SkillAffix[];
    icon: string;
    is_unlock: boolean;
    name: string;
  }

  /**
   * @description 技能效果数据类型
   * @interface SkillAffix
   * @since Beta v0.5.3
   * @property {string} name - 效果名称
   * @property {string} value - 效果值
   * @return SkillAffix
   */
  interface SkillAffix {
    name: string;
    value: string;
  }

  /**
   * @description 推荐圣遗物属性数据类型
   * @interface RelicRecommendProp
   * @since Beta v0.5.3
   * @property {PropRecommend} recommend_properties - 推荐属性
   * @property {PropRecommend|null} custom_properties - 自定义属性
   * @property {boolean} has_set_recommend_prop - 是否有套装推荐属性
   * @return RelicRecommendProp
   */
  interface RelicRecommendProp {
    recommend_properties: PropRecommend;
    custom_properties: PropRecommend | null;
    has_set_recommend_prop: boolean;
  }

  /**
   * @description 推荐属性数据类型
   * @interface PropRecommend
   * @since Beta v0.5.3
   * @property {number[]} sand_main_property_list - 推荐主属性列表
   * @property {number[]} goblet_main_property_list - 推荐主属性列表
   * @property {number[]} circlet_main_property_list - 推荐主属性列表
   * @property {number[]} sub_property_list - 推荐副属性列表
   * @return PropRecommend
   */
  interface PropRecommend {
    sand_main_property_list: number[];
    goblet_main_property_list: number[];
    circlet_main_property_list: number[];
    sub_property_list: number[];
  }

  /**
   * @description 角色属性映射数据类型
   * @interface PropMap
   * @since Beta v0.5.3
   * @type {[key:string]:DetailPropMapItem} - 属性映射
   * @return PropMap
   */
  interface PropMap {
    [key: string]: PropMapItem;
  }

  /**
   * @description 角色属性映射项数据类型
   * @interface PropMapItem
   * @since Beta v0.5.3
   * @property {number} property_type - 属性类型，与key一致
   * @property {string} name - 属性名称
   * @property {string} icon - 属性图标
   * @property {string} filter_name - 属性过滤名称
   * @return PropMapItem
   */
  interface PropMapItem {
    property_type: number;
    name: string;
    icon: string;
    filter_name: string;
  }
}
