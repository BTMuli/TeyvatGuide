/**
 * 米游社相关枚举
 * @since Beta v0.9.9
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

/**
 * 话题排序类型
 * @since Beta v0.9.9
 * @see TGApp.BBS.Post.PostTopicSortType
 */
const PostTopicSortTypeEnum: typeof TGApp.BBS.Post.PostTopicSortType = {
  LATEST: 0,
  FEATURED: 1,
  HOT: 2,
};

/**
 * 根据话题排序类型获取描述
 * @since Beta v0.9.9
 */
function getPostTopicSortTypeDesc(sortType: TGApp.BBS.Post.PostTopicSortTypeEnum): string {
  switch (sortType) {
    case PostTopicSortTypeEnum.LATEST:
      return "最新";
    case PostTopicSortTypeEnum.FEATURED:
      return "精选";
    case PostTopicSortTypeEnum.HOT:
      return "热门";
  }
}

/**
 * 论坛排序类型
 * @since Beta v0.9.9
 * @see TGApp.BBS.Post.ForumSortType
 */
const ForumSortTypeEnum: typeof TGApp.BBS.Post.ForumSortType = {
  LATEST_REPLY: 1,
  LATEST_POST: 2,
  HOT: 3,
};

/**
 * 根据论坛排序类型获取描述
 * @since Beta v0.9.9
 */
function getForumSortTypeDesc(sortType: TGApp.BBS.Post.ForumSortTypeEnum): string {
  switch (sortType) {
    case ForumSortTypeEnum.LATEST_REPLY:
      return "最新回复";
    case ForumSortTypeEnum.LATEST_POST:
      return "最新发布";
    case ForumSortTypeEnum.HOT:
      return "热门";
  }
}

/**
 * 搜索排序类型
 * @since Beta v0.9.9
 * @see TGApp.BBS.Post.SearchSortType
 */
const SearchSortTypeEnum: typeof TGApp.BBS.Post.SearchSortType = {
  HOT: 1,
  LATEST: 2,
};

/**
 * 根据搜索排序类型获取描述
 * @since Beta v0.9.9
 */
function getSearchSortTypeDesc(sortType: TGApp.BBS.Post.SearchSortTypeEnum): string {
  switch (sortType) {
    case SearchSortTypeEnum.HOT:
      return "最热";
    case SearchSortTypeEnum.LATEST:
      return "最新";
  }
}

/**
 * 回复排序类型
 * @since Beta v0.9.9
 * @see TGApp.BBS.Reply.ReplyOrderType
 */
const ReplyOrderTypeEnum: typeof TGApp.BBS.Reply.ReplyOrderType = {
  HOT: 0,
  OLDEST: 1,
  LATEST: 2,
};

/**
 * 获取回复排序类型描述
 * @since Beta v0.9.9
 */
function getReplyOrderTypeDesc(replyType: TGApp.BBS.Reply.ReplyOrderTypeEnum): string {
  switch (replyType) {
    case ReplyOrderTypeEnum.HOT:
      return "热门";
    case ReplyOrderTypeEnum.OLDEST:
      return "最早";
    case ReplyOrderTypeEnum.LATEST:
      return "最新";
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
    topicSortType: PostTopicSortTypeEnum,
    topicSortTypeDesc: getPostTopicSortTypeDesc,
    forumSortType: ForumSortTypeEnum,
    forumSortTypeDesc: getForumSortTypeDesc,
    searchSortType: SearchSortTypeEnum,
    searchSortTypeDesc: getSearchSortTypeDesc,
    replyOrderType: ReplyOrderTypeEnum,
    replyOrderTypeDesc: getReplyOrderTypeDesc,
  },
};

export default bbsEnum;
