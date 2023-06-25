/**
 * @file types Sqlite Account.d.ts
 * @description Sqlite Account 类型定义文件
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.5
 */

declare namespace TGApp.Sqlite.Account {
  /**
   * @description 游戏账号类型
   * @since Alpha v0.1.5
   * @interface Game
   * @property {string} gameBiz 游戏 biz，例如 hk4e_cn
   * @property {string} gameUid 游戏 uid
   * @property {number} isChosen 是否为当前选中账号
   * @property {number} isOfficial 是否为官服账号
   * @property {string} level 游戏等级
   * @property {string} nickname 游戏昵称
   * @property {string} region 游戏区域
   * @property {string} regionName 游戏区域名称
   * @return Game
   */
  export interface Game {
    gameBiz: string;
    gameUid: string;
    isChosen: 0 | 1;
    isOfficial: 0 | 1;
    level: string;
    nickname: string;
    region: string;
    regionName: string;
  }
}
