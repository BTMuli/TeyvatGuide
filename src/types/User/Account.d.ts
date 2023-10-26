/**
 * @file types/User/Account.d.ts
 * @description 用户账号相关类型定义文件
 * @since Alpha v0.1.5
 */

/**
 * @description 用户账号相关类型定义命名空间
 * @since Alpha v0.1.5
 * @namespace TGApp.User.Account
 * @memberof TGApp.User
 */
declare namespace TGApp.User.Account {
  /**
   * @description 游戏账号返回类型
   * @interface GameResponse
   * @since Alpha v0.1.5
   * @extends TGApp.BBS.Response.Base
   * @property {Game[]} data.list 游戏账号列表
   * @return GameResponse
   */
  interface GameResponse extends TGApp.BBS.Response.Base {
    retcode: 0;
    data: {
      list: Game[];
    };
  }

  /**
   * @description 游戏账号类型
   * @interface Game
   * @since Alpha v0.1.5
   * @property {string} game_biz 游戏 biz，例如 hk4e_cn
   * @property {string} game_uid 游戏 uid
   * @property {boolean} is_chosen 是否为当前选中账号
   * @property {boolean} is_official 是否为官服账号
   * @property {string} level 游戏等级
   * @property {string} nickname 游戏昵称
   * @property {string} region 游戏区域
   * @property {string} region_name 游戏区域名称
   * @return Game
   */
  interface Game {
    game_biz: string;
    game_uid: string;
    is_chosen: boolean;
    is_official: boolean;
    level: string;
    nickname: string;
    region: string;
    region_name: string;
  }
}
