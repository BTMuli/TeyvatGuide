/**
 * @file plugins Mys interface user.ts
 * @description Mys 插件用户接口
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.2
 */

import { type MysResponse } from "./base";

/**
 * @description 用户信息返回数据-在米游社用户主页中的用户信息
 * @since Alpha v0.1.2
 * @interface UserResponse
 * @extends {MysResponse}
 * @property {UserInfoFull} data 用户信息
 * @returns {UserResponse}
 */
export interface UserResponse extends MysResponse {
  data: UserInfoFull
}

/**
 * @description 用户信息-在米游社用户主页中的用户信息
 * @since Alpha v0.1.2
 * @interface UserInfoFull
 * @property {UserInfo} user_info 用户信息
 * @property {unknown} follow_relation 关注关系
 * @property {unknown[]} auth_relations 认证关系
 * @property {boolean} is_in_blacklist 是否在黑名单中
 * @property {boolean} is_has_collection 是否有收藏
 * @property {boolean} is_creator 是否是创作者
 * @property custom_service 客服信息
 * @property {boolean} custom_service.is_customer_service_staff 是否是客服
 * @property {number} custom_service.game_id 游戏 ID
 * @property  audit_info 审核信息
 * @property {boolean} audit_info.is_nickname_in_audit 是否在昵称审核中
 * @property {string} audit_info.nickname 审核中的昵称
 * @property {boolean} audit_info.is_introduce_in_audit 是否在简介审核中
 * @property {string} audit_info.introduce 审核中的简介
 * @property {number} audit_info.nickname_status 昵称审核状态
 * @returns {UserInfoFull}
 */
export interface UserInfoFull {
  user_info: UserInfo
  follow_relation: unknown
  auth_relations: unknown[]
  is_in_blacklist: boolean
  is_has_collection: boolean
  is_creator: boolean
  custom_service: {
    is_customer_service_staff: boolean
    game_id: number
  }
  audit_info: {
    is_nickname_in_audit: boolean
    nickname: string
    is_introduce_in_audit: boolean
    introduce: string
    nickname_status: number
  }
}

/**
 * @description 用户信息-在米游社用户主页中的用户信息
 * @since Alpha v0.1.2
 * @interface UserInfo
 * @property {string} uid 用户 ID
 * @property {string} nickname 用户昵称
 * @property {string} introduce 用户简介
 * @property {string} avatar 用户头像编号
 * @property {number} gender 用户性别
 * @property {UserCertification} certification 用户认证信息
 * @property {UserLevelExp[]} level_exps 用户等级经验
 * @property {UserArchive} archive 用户档案
 * @property {UserCommunityInfo} community_info 用户社区信息
 * @property {string} avatar_url 用户头像链接
 * @property {UserCertification[]} certifications 用户认证信息
 * @property {UserLevelExp} level_exp 用户等级经验
 * @property {string} pendant 用户挂件 URL，可能为 ""
 * @property {boolean} is_logoff 是否注销
 * @property {string} ip_region 用户 IP 地区
 * @returns {UserInfo}
 */
export interface UserInfo {
  uid: string
  nickname: string
  introduce: string
  avatar: string
  gender: number
  certification: UserCertification
  level_exps: UserLevelExp[]
  archive: UserArchive
  community_info: UserCommunityInfo
  avatar_url: string
  certifications: UserCertification[]
  level_exp: UserLevelExp
  pendant: string
  is_logoff: boolean
  ip_region: string
}

/**
 * @description 用户认证信息
 * @since Alpha v0.1.2
 * @interface UserCertification
 * @property {number} type 认证类型
 * @property {string} label 认证标签
 * @returns {UserCertification}
 */
export interface UserCertification {
  type: number
  label: string
}

/**
 * @description 用户等级经验
 * @since Alpha v0.1.2
 * @interface UserLevelExp
 * @property {number} level 用户等级
 * @property {number} exp 用户经验
 * @see MysGid 游戏 ID
 * @property {number} game_id 游戏 ID
 * @returns {UserLevelExp}
 */
export interface UserLevelExp {
  level: number
  exp: number
  game_id: number
}

/**
 * @description 用户档案
 * @since Alpha v0.1.2
 * @interface UserArchive
 * @property {string} like_num 获赞数
 * @property {string} post_num 发帖数
 * @property {string} replypost_num 回帖数
 * @property {string} follow_cnt 关注数
 * @property {string} followed_cnt 被关注数
 * @property {string} topic_cnt 话题数
 * @property {string} new_follower_num 新粉丝数
 * @property {string} good_post_num 精华帖数
 * @property {string} follow_collection_cnt 收藏数
 * @returns {UserArchive}
 */
export interface UserArchive {
  like_num: string
  post_num: string
  replypost_num: string
  follow_cnt: string
  followed_cnt: string
  topic_cnt: string
  new_follower_num: string
  good_post_num: string
  follow_collection_cnt: string
}

/**
 * @description 用户社区信息
 * @since Alpha v0.1.2
 * @interface UserCommunityInfo
 * @property {boolean} is_realname 是否实名
 * @property {boolean} agree_status 是否同意协议
 * @property {number} silent_end_time 禁言结束时间
 * @property {number} forbid_end_time 封禁结束时间
 * @property {number} info_upd_time 信息更新时间
 * @property privacy_invisible 用户隐私设置
 * @property {boolean} privacy_invisible.post 是否隐藏发帖
 * @property {boolean} privacy_invisible.collect 是否隐藏收藏
 * @property {boolean} privacy_invisible.watermark 是否隐藏水印
 * @property {boolean} privacy_invisible.reply 是否隐藏回复
 * @property {boolean} privacy_invisible.post_and_instant 是否隐藏发帖和即时
 * @property notify_disable 用户通知设置
 * @property {boolean} notify_disable.reply 是否禁用回复通知
 * @property {boolean} notify_disable.upvote 是否禁用点赞通知
 * @property {boolean} notify_disable.follow 是否禁用关注通知
 * @property {boolean} notify_disable.system 是否禁用系统通知
 * @property {boolean} notify_disable.chat 是否禁用聊天通知
 * @property {boolean} has_initialized 是否初始化
 * @property user_func_status 用户功能状态
 * @property {boolean} user_func_status.enable_history_view 是否启用历史记录
 * @property {boolean} user_func_status.enable_recommend 是否启用推荐
 * @property {boolean} user_func_status.enable_mention 是否启用提及
 * @property {number} user_func_status.user_center_view 是否启用用户中心\
 * @property {unknown[]} forum_silent_info 论坛禁言信息
 * @property {string} last_login_ip 上次登录 IP
 * @property {number} last_login_time 上次登录时间
 * @property {number} created_at 创建时间
 * @returns {UserCommunityInfo}
 */
export interface UserCommunityInfo {
  is_realname: boolean
  agree_status: boolean
  silent_end_time: number
  forbid_end_time: number
  info_upd_time: number
  privacy_invisible: {
    post: boolean
    collect: boolean
    watermark: boolean
    reply: boolean
    post_and_instant: boolean
  }
  notify_disable: {
    reply: boolean
    upvote: boolean
    follow: boolean
    system: boolean
    chat: boolean
  }
  has_initialized: boolean
  user_func_status: {
    enable_history_view: boolean
    enable_recommend: boolean
    enable_mention: boolean
    user_center_view: number
  }
  forum_silent_info: unknown[]
  last_login_ip: string
  last_login_time: number
  created_at: number
}

/**
 * @description 用户信息-在 post 中的用户信息
 * @since Alpha v0.1.2
 * @interface UserInfoPost
 * @property {string} uid 用户 ID
 * @property {string} nickname 用户昵称
 * @property {string} introduce 用户简介
 * @property {string} avatar 用户头像 // TODO: 转换为图片链接
 * @property {number} gender 用户性别 // TODO: 未知
 * @property {UserCertification} certification 用户认证信息
 * @property level_exp 用户等级经验
 * @property {number} level_exp.level 用户等级
 * @property {number} level_exp.exp 用户经验
 * @property {boolean} is_following 是否关注
 * @property {boolean} is_follower 是否被关注
 * @property {string} avatar_url 用户头像链接
 * @property {string} pendant 用户挂件 URL，可能为 ""
 * @returns {UserInfoPost}
 */
export interface UserInfoPost {
  uid: string
  nickname: string
  introduce: string
  avatar: string
  gender: number
  certification: UserCertification
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
