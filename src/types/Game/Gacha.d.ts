/**
 * @file types/Game/Gacha.d.ts
 * @description 游戏抽卡相关类型定义文件
 * @since Beta v0.3.0
 */

/**
 * @description 游戏抽卡相关类型定义命名空间
 * @since Beta v0.3.0
 * @namespace TGApp.Game.Gacha
 * @memberof TGApp.Game
 */
declare namespace TGApp.Game.Gacha {
  /**
   * @description 获取 authkey 返回类型
   * @interface AuthkeyResponse
   * @since Beta v0.3.0
   * @extends TGApp.BBS.Response.Base
   * @property {number} data.sign_type - 签名类型
   * @property {number} data.authkey_ver - authkey 版本
   * @property {string} data.authkey - authkey
   * @return AuthkeyResponse
   */
  interface AuthkeyResponse extends TGApp.BBS.Response.Base {
    retcode: 0;
    data: {
      sign_type: number;
      authkey_ver: number;
      authkey: string;
    };
  }

  /**
   * @description 获取抽卡记录返回类型
   * @interface GachaLogResponse
   * @since Beta v0.3.0
   * @extends TGApp.BBS.Response.Base
   * @property {number} data.page - 页码
   * @property {number} data.size - 每页大小
   * @property {number} data.total - 总数
   * @property {GachaItem[]} data.list - 抽卡记录列表
   * @return GachaLogResponse
   */
  interface GachaLogResponse extends TGApp.BBS.Response.Base {
    retcode: 0;
    data: {
      page: number;
      size: number;
      total: number;
      list: GachaItem[];
    };
  }

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
  interface GachaItem {
    uid: string;
    gacha_type: string;
    item_id: string;
    count: string;
    time: string;
    name: string;
    lang: string;
    item_type: string;
    rank_type: string;
    id: string;
  }
}
