/**
 * @file src/enum/bbs.ts
 * @description BBS 相关枚举
 * @since Beta v0.7.9
 */

/**
 * @description 用户头像类型
 * @since Beta v0.7.9
 * @enum AvatarExtTypeEnum
 */
export const AvatarExtTypeEnum: typeof TGApp.BBS.User.AvatarExtType = {
  CUSTOM: 0,
  GIF: 3,
};

/**
 * @description 头像拓展资源类型
 * @since Beta v0.7.9
 * @enum AvatarExtResTypeEnum
 */
export const AvatarExtResTypeEnum: typeof TGApp.BBS.User.AvatarExtResType = {
  WEBP: 1,
  APNG: 2,
  GIF: 3,
  PNG: 4,
};
