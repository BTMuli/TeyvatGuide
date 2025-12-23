/**
 * 祈愿/颂愿类型定义文件
 * @since Beta v0.8.4
 */

declare namespace TGApp.Game.Gacha {
  /**
   * 获取 authKey 返回响应
   * @since Beta v0.8.4
   */
  type AuthKeyResp = TGApp.BBS.Response.BaseWithData<AuthKeyRes>;

  /**
   * 获取 authKey 返回数据
   * @since Beta v0.8.4
   */
  type AuthKeyRes = {
    /** 签名类型 */
    sign_type: number;
    /** authKey 版本 */
    authkey_ver: number;
    /** authKey */
    authkey: string;
  };

  /**
   * 获取祈愿记录返回响应
   * @since Beta v0.8.4
   */
  type GachaLogResp = TGApp.BBS.Response.BaseWithData<GachaLogRes>;

  /**
   * 获取颂愿记录返回响应
   * @since Beta v0.8.4
   */
  type GachaBLogResp = TGApp.BBS.Response.BaseWithData<GachaBLogRes>;

  /**
   * 祈愿记录返回数据
   * @since Beta v0.8.4
   */
  type GachaLogRes = {
    /** 页码 */
    page: number;
    /** 每页大小 */
    size: number;
    /** 页数 */
    total: number;
    /** 祈愿数据 */
    list: Array<GachaItem>;
  };

  /**
   * 祈愿类型
   * @since Beta v0.9.1
   */
  const GachaType = <const>{
    /** 新手祈愿 */
    Newbie: "100",
    /** 常驻祈愿 */
    Normal: "200",
    /** 角色活动祈愿 */
    AvatarUp: "301",
    /** 角色活动祈愿2 */
    AvatarUp2: "400",
    /** 武器活动祈愿 */
    WeaponUp: "302",
    /** 集录祈愿 */
    MixUp: "500",
  };

  /**
   * 祈愿类型枚举
   * @since Beta v0.9.1
   */
  type GachaTypeEnum = (typeof GachaType)[keyof typeof GachaType];

  /**
   * 祈愿数据
   * @since Beta v0.9.1
   */
  type GachaItem = {
    /** 用户 UID */
    uid: string;
    /** 抽卡类型 */
    gacha_type: GachaTypeEnum;
    /**
     * 物品 ID
     * @remarks 一般为空，需要自己补充
     */
    item_id: string;
    /**
     * 计数
     * @remarks 一般为1
     */
    count: string;
    /** 时间 */
    time: string;
    /** 名称 */
    name: string;
    /** 语言 */
    lang: string;
    /** 物品类型 */
    item_type: string;
    /** 星级 */
    rank_type: string;
    /** 记录 ID */
    id: number;
  };

  /**
   * 颂愿记录返回数据
   * @since Beta v0.8.4
   */
  type GachaBLogRes = {
    /** 数据 */
    list: Array<GachaBItem>;
    /** 总数 */
    total: number;
  };

  /**
   * 颂愿类型
   * @since Beta v0.9.1
   */
  const GachaBType = <const>{
    /** 常驻祈愿 */
    Normal: "1000",
    /** 活动祈愿 */
    Event: "2000",
    /** 男性活动祈愿1 */
    EventBoy1: "20011",
    /** 男性活动祈愿2 */
    EventBoy2: "20012",
    /** 女性活动祈愿1 */
    EventGirl1: "20021",
    /** 女性活动祈愿2 */
    EventGirl2: "20022",
  };

  /**
   * 颂愿类型枚举
   * @since Beta v0.9.1
   */
  type GachaBTypeEnum = (typeof GachaBType)[keyof typeof GachaType];

  /**
   * 颂愿记录
   * @since Beta v0.9.1
   */
  type GachaBItem = {
    /** 记录 ID */
    id: string;
    /**
     * 是否是UP
     * @example 1 | 0
     */
    is_up: string;
    /** 物品 ID  */
    item_id: string;
    /** 物品名称 */
    item_name: string;
    /** 物品类型 */
    item_type: string;
    /** 抽卡类型 */
    op_gacha_type: GachaBTypeEnum;
    /** 星级 */
    rank_type: string;
    /** 服务器 */
    region: string;
    /** 卡池排期 ID */
    schedule_id: string;
    /** 时间 */
    time: string;
    /** 用户 UID */
    uid: string;
  };
}
