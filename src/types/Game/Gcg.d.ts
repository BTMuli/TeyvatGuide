/**
 * 七圣召唤战绩接口类型。
 * @since Beta v0.14.1
 */

declare namespace TGApp.Game.Gcg {
  /** 用户收藏视图。 @since Beta v0.14.1 */
  type CollectionTab = "decks" | "cards" | "backs";

  /** 用户收藏的卡牌类别。 @since Beta v0.14.1 */
  type CardFilter = "all" | "avatar" | "action";

  /** 七圣召唤接口对应的数据类型。 @since Beta v0.14.1 */
  type Endpoints = {
    basicInfo: BasicInfo;
    deckList: Decks;
    cardList: Cards;
    cardBackList: CardBacks;
    matchList: Matches;
    "challenge/schedule": Schedules;
    "challenge/record": Challenge;
    "challenge/deck": ChallengeDeck;
  };

  /** 牌手等级和卡牌收集进度。 @since Beta v0.14.1 */
  type BasicInfo = {
    level: number;
    avatar_card_num_gained: number;
    avatar_card_num_total: number;
    action_card_num_gained: number;
    action_card_num_total: number;
    is_version_upgrading?: boolean;
  };

  /** 行动牌花费。 @since Beta v0.14.1 */
  type CardCost = { cost_type: string; cost_value: number };

  /** 角色牌技能。 @since Beta v0.14.1 */
  type CardSkill = { id: number; name: string; desc: string; tag: string };

  /** 角色牌或行动牌。牌组列表可只返回基础字段。 @since Beta v0.14.1 */
  type Card = {
    id: number | string;
    name: string;
    image: string;
    icon?: string;
    num?: number;
    hp?: number;
    use_count?: number;
    proficiency?: number;
    action_cost?: Array<CardCost>;
    card_skills?: Array<CardSkill>;
    desc?: string;
    card_sources?: Array<string>;
  };

  /** 牌组及其分享信息。 @since Beta v0.14.1 */
  type Deck = {
    id: number | string;
    name: string;
    avatar_cards?: Array<Card> | null;
    action_cards?: Array<Card> | null;
    is_valid?: boolean;
    share_code?: string;
  };

  /** 自建牌组列表。 @since Beta v0.14.1 */
  type Decks = { deck_list?: Array<Deck> | null };

  /** 卡牌列表及下一页位置。 @since Beta v0.14.1 */
  type Cards = {
    card_list?: Array<Card> | null;
    next_offset?: number | string | null;
    is_last?: boolean;
  };

  /** 可收集的牌背。 @since Beta v0.14.1 */
  type CardBack = {
    id: number | string;
    name?: string | null;
    image_v2: string;
    image?: string;
    has_obtained: boolean;
  };

  /** 牌背列表。 @since Beta v0.14.1 */
  type CardBacks = { card_back_list?: Array<CardBack> | null };

  /** 最近和收藏对局。 @since Beta v0.14.1 */
  type Matches = {
    recent_matches?: Array<Match> | null;
    favourite_matches?: Array<Match> | null;
  };

  /** 一场对局的队伍、结果和时间。 @since Beta v0.14.1 */
  type Match = {
    is_win: boolean;
    match_type: string;
    match_time: { year: number; month: number; day: number; hour: number; minute: number };
    self: MatchPlayer;
    opposite: MatchPlayer;
  };

  /** 对局一方的昵称和出战角色图标。 @since Beta v0.14.1 */
  type MatchPlayer = {
    name: string;
    linups?: Array<string> | null;
    is_overflow?: boolean;
  };

  /** 胜冠之试档期。 @since Beta v0.14.1 */
  type Schedule = { id: number | string; name: string };

  /** 可查看的胜冠之试档期。 @since Beta v0.14.1 */
  type Schedules = { schedule_list?: Array<Schedule> | null };

  /** 某期胜冠之试成绩。 @since Beta v0.14.1 */
  type Challenge = {
    basic?: { win_cnt?: number; medal?: string } | null;
    deck_list?: Array<DeckRecord> | null;
    honor_character?: Array<HonorCharacter> | null;
  };

  /** 用于展示的牌组及胜场数。 @since Beta v0.14.1 */
  type DeckRecord = { deck: Deck; win_cnt?: number };

  /** 胜冠之试荣誉角色。 @since Beta v0.14.1 */
  type HonorCharacter = { card_icon: string; name?: string; card_name?: string };

  /** 胜冠之试使用牌组详情。 @since Beta v0.14.1 */
  type ChallengeDeck = { deck_detail?: DeckRecord | null };
}
