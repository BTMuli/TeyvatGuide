/**
 * @file types/Game/Gacha.d.ts
 * @description 游戏抽卡相关类型定义文件
 * @since Beta v0.8.4
 */

declare namespace TGApp.Game.Gacha {
  /**
   * @description 获取 authkey 返回类型
   * @interface AuthkeyResp
   * @since Beta v0.8.4
   * @extends TGApp.BBS.Response.BaseWithData
   */
  type AuthkeyResp = TGApp.BBS.Response.BaseWithData<AuthkeyRes>;

  /**
   * @description 获取 authkey 数据类型
   * @interface AuthkeyRes
   * @since Beta v0.8.4
   * @property {number} sign_type - 签名类型
   * @property {number} authkey_ver - authkey 版本
   * @property {string} authkey - authkey
   */
  type AuthkeyRes = { sign_type: number; authkey_ver: number; authkey: string };

  /**
   * @description 获取抽卡记录返回类型
   * @interface GachaLogResp
   * @since Beta v0.8.4
   * @extends TGApp.BBS.Response.BaseWithData
   */
  type GachaLogResp = TGApp.BBS.Response.BaseWithData<GachaLogRes>;

  /**
   * @description 获取千星奇域抽卡记录返回类型
   * @interface GachaBLogResp
   * @since Beta v0.8.4
   * @extends TGApp.BBS.Response.BaseWithData
   */
  type GachaBLogResp = TGApp.BBS.Response.BaseWithData<GachaBLogRes>;

  /**
   * @description 抽卡记录返回数据类型
   * @interface GachaLogRes
   * @since Beta v0.8.4
   * @property {number} page - 页码
   * @property {number} size - 每页大小
   * @property {number} total - 总数
   * @property {Array<GachaItem>} list - 抽卡记录列表
   */
  type GachaLogRes = {
    page: number;
    size: number;
    total: number;
    list: Array<GachaItem>;
  };

  /**
   * @description 抽卡记录类型
   * @interface GachaItem
   * @since Beta v0.3.0
   * @property {string} uid - 用户 uid
   * @property {string} gacha_type - 抽卡类型 // 100: 新手祈愿, 200: 常驻祈愿, 301: 角色活动祈愿, 302: 武器活动祈愿 400：角色活动祈愿2
   * @property {string} item_id - 物品 id // 一般为 ""，需要自己添加
   * @property {string} count - 数量
   * @property {string} time - 时间 // yyyy-MM-dd HH:mm:ss
   * @property {string} name - 物品名称
   * @property {string} lang - 语言
   * @property {string} item_type - 物品类型 // “武器” “角色”
   * @property {string} rank_type - 星级
   * @property {string} id - 抽卡记录 id
   * @return GachaItem
   */
  type GachaItem = {
    uid: string;
    gacha_type: string;
    item_id: string;
    count: string;
    time: string;
    name: string;
    lang: string;
    item_type: string;
    rank_type: string;
    id: number;
  };

  /**
   * @description 千星奇域抽卡记录返回数据类型
   * @interface GachaBLogRes
   * @since Beta v0.8.4
   * @property {Array<GachaBItem>} list - 页码
   * @property {number} total - 总数
   */
  type GachaBLogRes = { list: Array<GachaBItem>; total: number };

  /**
   * @description 千星奇域抽卡记录类型
   * @interface GachaBItem
   * @since Beta v0.8.4
   * @property {string} id - 抽卡记录 id
   * @property {string} is_up - 是否为UP池,0-否，1-是
   * @property {string} item_id - 物品 id
   * @property {string} item_name - 物品名称
   * @property {string} item_type - 物品类型
   * @property {string} op_gacha_type - 抽卡类型，用于接口请求
   * @property {string} rank_type - 星级
   * @property {string} region - 区域
   * @property {string} schedule_id - 排期ID
   * @property {string} time - 抽卡时间，格式：yyyy-MM-dd HH:mm:ss
   * @property {string} uid - 用户 uid
   */
  type GachaBItem = {
    id: string;
    is_up: string;
    item_id: string;
    item_name: string;
    item_type: string;
    op_gacha_type: string;
    rank_type: string;
    region: string;
    schedule_id: string;
    time: string;
    uid: string;
  };
}
