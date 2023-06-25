/**
 * @file types App Account.d.ts
 * @description App 账号相关类型定义文件
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.2.0
 */

declare namespace TGApp.App.Account {
  /**
   * @description 用户简略信息
   * @since Alpha v0.2.0
   * @interface BriefInfo
   * @property {string} nickname 用户昵称
   * @property {string} uid 用户 uid
   * @property {string} avatar 用户头像
   * @property {string} desc 用户简介
   * @return BriefInfo
   */
  export interface BriefInfo {
    nickname: string;
    uid: string;
    avatar: string;
    desc: string;
  }
}
