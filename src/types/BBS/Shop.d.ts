/**
 * 米游社商店类型定义文件
 * @since Beta v0.13.1
 */

declare namespace TGApp.BBS.Shop {
  /**
   * 商店商品分类键。
   * @since Beta v0.13.1
   */
  type GameKey = string;

  /**
   * 商店接口的余额响应。
   * @since Beta v0.13.1
   */
  type PointResp = TGApp.BBS.Response.BaseWithData<PointInfo>;

  /**
   * 米游币余额信息。
   * @since Beta v0.13.1
   */
  type PointInfo = {
    /** 积分类型，米游币为 myb */
    point_sn?: string;
    /** 当前余额 */
    points: number;
  };

  /**
   * 商店分类。
   * @since Beta v0.13.1
   */
  type Game = {
    /** 分类键 */
    key: GameKey;
    /** 分类名称 */
    name: string;
    /** 分类图标 */
    icon?: string;
  };

  /**
   * 商品列表响应。
   * @since Beta v0.13.1
   */
  type GoodsListResp = TGApp.BBS.Response.BaseWithData<GoodsListRes>;

  /**
   * 商品列表数据。
   * @since Beta v0.13.1
   */
  type GoodsListRes = {
    /** 当前页商品列表 */
    list: Array<Goods>;
    /** 当前筛选条件下的商品数量 */
    total: number;
    /** 官方接口原始分类字段 */
    games?: Array<Game>;
  };

  /**
   * 商品详情响应。
   * @since Beta v0.13.1
   */
  type GoodsDetailResp = TGApp.BBS.Response.BaseWithData<Goods>;

  /**
   * 商品展示状态。
   * @since Beta v0.13.1
   */
  type GoodsStatus =
    "available" | "upcoming" | "sold-out" | "ended" | "limit-reached" | "unavailable";

  /**
   * 商品的限购范围与剩余数量。
   * @since Beta v0.13.1
   */
  type GoodsLimit = {
    scope: "account" | "role";
    type: string;
    limit: number;
    used: number;
    remaining: number;
  };

  /**
   * 商品数据。
   * @since Beta v0.13.1
   */
  type Goods = {
    /** 商品 ID */
    goods_id: string;
    /** 商品名称 */
    goods_name: string;
    /** 商品图标 */
    icon: string;
    /** 商品价格（米游币） */
    price: number;
    /** 积分类型 */
    point_sn: string;
    /** 商品种类，1 为实物，2 为虚拟道具 */
    type: number;
    /** 分类键；列表接口可能不返回，页面按筛选条件回填 */
    game?: GameKey;
    /** 游戏发放业务 */
    game_biz: string;
    /** 商品详情富文本 */
    goods_detail?: string;
    /** 当前可售库存；不是累计库存 */
    total: number;
    /** 是否不限库存 */
    unlimit?: boolean;
    /** 下一批库存数量 */
    next_num: number;
    /** 下一批开放时间（秒级时间戳） */
    next_time?: number;
    /** 商品状态 */
    status?: string;
    /** 开售时间；接口可能返回数字或字符串 */
    start?: number | string;
    /** 停售时间；接口可能返回数字或字符串 */
    end?: number | string;
    /** 详情接口使用的开售时间字段 */
    sale_start_time?: number | string;
    /** 当前服务器时间（秒级时间戳） */
    now_time?: number;
    /** 账户周期限购类型 */
    account_cycle_type: string;
    /** 账户周期限购数量 */
    account_cycle_limit: number;
    /** 账户周期内已兑换数量 */
    account_exchange_num: number;
    /** 角色周期限购类型 */
    role_cycle_type: string;
    /** 角色周期限购数量 */
    role_cycle_limit: number;
    /** 角色周期内已兑换数量 */
    role_exchange_num: number;
    /** BBS 商品发放信息 */
    bbs_detail?: Array<{ item_exchange_text?: string }>;
    /** 商品兑换规则；规则字段随商品类型变化 */
    rules?: Array<Record<string, unknown>>;
  };

  /**
   * 商店角色信息。
   * @since Beta v0.13.1
   */
  type Role = Pick<
    TGApp.BBS.Game.Account,
    | "game_biz"
    | "game_uid"
    | "is_chosen"
    | "is_official"
    | "level"
    | "nickname"
    | "region"
    | "region_name"
  >;

  /**
   * 商品详情中可选择的接收角色。
   * @since Beta v0.13.1
   */
  type RoleOption = {
    key: string;
    label: string;
  };

  /**
   * 兑换参数。
   * @since Beta v0.13.1
   */
  type ExchangeParams = {
    /** 商店应用 ID */
    app_id: number;
    /** 积分类型 */
    point_sn: "myb";
    /** 商品 ID */
    goods_id: string;
    /** 兑换数量 */
    exchange_num: number;
    /** 发放目标 UID */
    uid: string;
    /** 发放目标业务 */
    game_biz: string;
    /** 游戏区服；BBS 商品不携带该字段 */
    region?: string;
    /** 实物收货地址 ID；虚拟商品使用 0 */
    address_id: number;
  };

  /**
   * 兑换响应。
   * @since Beta v0.13.1
   */
  type ExchangeResp = TGApp.BBS.Response.BaseWithData<ExchangeRes>;

  /**
   * 兑换结果。
   * @since Beta v0.13.1
   */
  type ExchangeRes = {
    /** 兑换订单号 */
    order_sn: string;
  };

  /**
   * 米游币记录响应。
   * @since Beta v0.13.1
   */
  type RecordResp = TGApp.BBS.Response.BaseWithData<RecordRes>;

  /**
   * 米游币记录数据。
   * @since Beta v0.13.1
   */
  type RecordRes = {
    /** 记录列表 */
    list: Array<RecordItem>;
    /** 下一页游标或时间戳 */
    next_time?: number | string;
  };

  /**
   * 米游币记录。
   * @since Beta v0.13.1
   */
  type RecordItem = {
    /** 积分类型 */
    point_sn: string;
    /** 记录标题 */
    title: string;
    /** 订单号 */
    order_sn: string;
    /** 记录描述 */
    comment: string;
    /** 操作类型，1 为增加，2 为消耗 */
    action: number;
    /** 变动数量 */
    num: number;
    /** 操作时间（秒级时间戳字符串） */
    order_time: string;
    /** 记录类型 */
    type: string;
    /** 记录类型名称 */
    type_name: string;
  };
}
