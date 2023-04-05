/**
 * @file plugins Mys interface user.ts
 * @description Mys 插件用户接口
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha
 */

// 用户接口

/**
 * @description 用户信息
 * @since Alpha
 * @interface User
 * @property {string} uid 用户 ID
 * @property {string} nickname 用户昵称
 * @property {string} introduce 用户简介
 * @property {string} avatar 用户头像 // TODO: 转换为图片链接
 * @property {number} gender 用户性别 // TODO: 未知
 * @property certification 用户认证信息
 * @property {number} certification.type 认证类型
 * @property {string} certification.label 认证标签
 * @property level_exp 用户等级经验
 * @property {number} level_exp.level 用户等级
 * @property {number} level_exp.exp 用户经验
 * @property {boolean} is_following 是否关注
 * @property {boolean} is_follower 是否被关注
 * @property {string} avatar_url 用户头像链接
 * @property {string} pendant 用户挂件 URL，可能为 ""
 * @returns {User}
 */
export interface User {
  uid: string
  nickname: string
  introduce: string
  avatar: string
  gender: number
  certification: {
    type: number
    label: string
  }
  level_exp: {
    level: number
    exp: number
  }
  is_following: boolean
  is_follower: boolean
  avatar_url: string
  pendant: string
}

/**
 * @description 用户操作
 * @since Alpha
 * @interface SelfOperation
 * @property {number} attitude 操作类型 // TODO: 未知
 * @property {boolean} is_collected 是否收藏
 * @returns {SelfOperation}
 */
export interface SelfOperation {
  attitude: number
  is_collected: boolean
}
