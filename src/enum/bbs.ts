/**
 * 米游社相关枚举
 * @since Beta v0.7.9
 */

/**
 * 用户头像类型
 * @since Beta v0.7.9
 * @see TGApp.BBS.User.AvatarExtTypeEnum
 */
const AvatarExtTypeEnum: typeof TGApp.BBS.User.AvatarExtType = {
  CUSTOM: 0,
  GIF: 3,
};

/**
 * 头像拓展资源类型
 * @since Beta v0.7.9
 * @see TGApp.BBS.User.AvatarExtResTypeEnum
 */
const AvatarExtResTypeEnum: typeof TGApp.BBS.User.AvatarExtResType = {
  WEBP: 1,
  APNG: 2,
  GIF: 3,
  PNG: 4,
};

/**
 * 帖子ViewType
 * @since Beta v0.8.4
 * @see TGApp.BBS.Post.ViewTypeEnum
 */
const PostViewTypeEnum: typeof TGApp.BBS.Post.PostViewType = {
  NORMAL: 1,
  PIC: 2,
  VOD: 5,
  UGC: 7,
};

/**
 * 咨讯类型
 * @since Beta v0.9.1
 * @see TGApp.BBS.Post.NewsType
 */
const PostNewsTypeEnum: typeof TGApp.BBS.Post.NewsType = {
  NOTICE: 1,
  ACTIVITY: 2,
  NEWS: 3,
};

/**
 * 咨讯类型只读列表
 * @since Beta v0.9.1
 */
const PostNewsTypeList: ReadonlyArray<TGApp.BBS.Post.NewsTypeEnum> = [
  PostNewsTypeEnum.NOTICE,
  PostNewsTypeEnum.ACTIVITY,
  PostNewsTypeEnum.NEWS,
];

/**
 * 根据咨讯类型获取描述
 * @since Beta v0.9.1
 */
function getPostNewsTypeDesc(newsType: TGApp.BBS.Post.NewsTypeEnum): string {
  switch (newsType) {
    case PostNewsTypeEnum.NOTICE:
      return "公告";
    case PostNewsTypeEnum.ACTIVITY:
      return "活动";
    case PostNewsTypeEnum.NEWS:
      return "资讯";
  }
}

/** 米游社相关枚举 */
const bbsEnum = {
  /** 用户信息相关枚举 */
  user: {
    avatarExtType: AvatarExtTypeEnum,
    avatarResType: AvatarExtResTypeEnum,
  },
  /** 帖子相关枚举 */
  post: {
    viewType: PostViewTypeEnum,
    newsType: PostNewsTypeEnum,
    newsTypeList: PostNewsTypeList,
    newsTypeDesc: getPostNewsTypeDesc,
  },
};

export default bbsEnum;
