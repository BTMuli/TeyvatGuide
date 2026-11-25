/**
 * 七圣召唤卡牌广场图鉴接口类型。
 * @since Beta v0.14.1
 */

declare namespace TGApp.Game.CardSquare {
  /** 图鉴卡牌类别。 @since Beta v0.14.1 */
  type CardTab = "role" | "action";

  /** 图鉴分类的筛选条件。 @since Beta v0.14.1 */
  type CatalogSelection = {
    element: number | null;
    actionType: number | null;
    actionTag: number | null;
    actionCost: number | null;
  };

  /** 卡牌基础信息。 @since Beta v0.14.1 */
  type BasicCard = {
    item_id: number;
    name: string;
    icon: string;
    icon_small: string;
    wiki_url: string;
    max_cnt: number;
  };

  /** 角色牌信息。 @since Beta v0.14.1 */
  type RoleCard = {
    basic: BasicCard;
    element: number;
    hp: number;
    skill_cost: number;
  };

  /** 行动牌信息。 @since Beta v0.14.1 */
  type ActionCard = {
    basic: BasicCard;
    card_type: number;
    card_tag: Array<string>;
    skill_element: string;
    skill_value: number;
    skill_element2: string;
    skill_value2: number;
    energy_cost: number;
  };

  /** 角色牌或行动牌联合类型。 @since Beta v0.14.1 */
  type Card = RoleCard | ActionCard;

  /** 卡牌筛选项。 @since Beta v0.14.1 */
  type FilterOption = {
    id: number;
    name: string;
  };

  /** 卡牌广场筛选项配置。 @since Beta v0.14.1 */
  type Filters = {
    role_element: Array<FilterOption>;
    action_type: Array<FilterOption>;
    action_tag: Array<FilterOption>;
    action_cost: Array<FilterOption>;
  };

  /** 行动牌筛选参数。 @since Beta v0.14.1 */
  type ActionFilters = {
    role_ids: Array<number>;
    type_id?: number;
    tag_id?: number;
    cost_id?: number;
  };

  /** 角色技能信息。 @since Beta v0.14.1 */
  type RoleSkill = {
    id: string;
    icon: string;
    name: string;
    type: Array<string>;
    rich_desc: string;
    cost_types?: Array<{
      cost_type: string;
      icon: string;
      cost_num: string;
    }> | null;
  };

  /** 行动牌技能详情。 @since Beta v0.14.1 */
  type ActionDetail = {
    cost1_raw: number;
    cost1_type_raw: string;
    cost1_type_icon: string;
    cost2_raw: number;
    cost2_type_raw: string;
    cost2_type_icon: string;
    desc: string;
    has_good_id: boolean;
    access: string;
  };
}
