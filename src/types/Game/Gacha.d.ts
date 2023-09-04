/**
 * @file types Game Gacha.d.ts
 * @description 游戏抽卡相关类型定义文件
 * @author BTMuli<bt-muli@outlook.com>
 * @since Beta v0.3.0
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
  export interface AuthkeyResponse extends TGApp.BBS.Response.Base {
    data: {
      sign_type: number;
      authkey_ver: number;
      authkey: string;
    };
  }
}
