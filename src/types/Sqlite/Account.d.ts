/**
 * @file types/Sqlite/Account.d.ts
 * @description Sqlite Account 类型定义文件
 * @since Beta v0.6.0
 */

declare namespace TGApp.Sqlite.Account {
  /**
   * @description UserAccount 表数据类型
   * @since Beta v0.6.0
   * @interface User
   * @property {string} uid - 米社UID
   * @property {string} brief - 用户信息
   * @property {string} cookie - 用户cookie
   * @property {string} updated - 更新时间
   * @returns User
   */
  interface User {
    uid: string;
    brief: string;
    cookie: string;
    updated: string;
  }

  /**
   * @description 游戏账号类型
   * @since Beta v0.6.0
   * @interface Game
   * @property {string} uid 米社UID
   * @property {string} gameBiz 游戏 biz，例如 hk4e_cn
   * @property {string} gameUid 游戏 uid
   * @property {number} isChosen 是否为当前选中账号
   * @property {number} isOfficial 是否为官服账号
   * @property {string} level 游戏等级
   * @property {string} nickname 游戏昵称
   * @property {string} region 游戏区域
   * @property {string} regionName 游戏区域名称
   * @property {string} updated 更新时间
   * @return Game
   */
  interface Game {
    uid: string;
    gameBiz: string;
    gameUid: string;
    isChosen: 0 | 1;
    isOfficial: 0 | 1;
    level: string;
    nickname: string;
    region: string;
    regionName: string;
    updated: string;
  }
}
