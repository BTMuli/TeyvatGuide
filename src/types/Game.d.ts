/**
 * @file types Game.d.ts
 * @description 游戏数据相关接口
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.2.0
 */

declare namespace BTMuli.User.Game {
  /**
   * @description 游戏账号
   * @see TGRequest.User.byCookie.getGameAccounts
   * @since Alpha v0.2.0
   * @property {string} game_biz 游戏 biz，例如 hk4e_cn
   * @property {string} game_uid 游戏 uid
   * @property {boolean} is_chosen 是否为当前选中账号
   * @property {string} is_official 是否为官服账号
   * @property {string} level 游戏等级
   * @property {string} nickname 游戏昵称
   * @property {string} region 游戏区域
   * @property {string} region_name 游戏区域名称
   * @returns Account
   */
  export interface Account {
    game_biz: string
    game_uid: string
    is_chosen: boolean
    is_official: boolean
    level: string
    nickname: string
    region: string
    region_name: string
  }
}
