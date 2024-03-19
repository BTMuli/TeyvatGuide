/**
 * @file plugins/Mys/utils/getPostsCard.ts
 * @description Mys 插件帖子渲染
 * @since Beta v0.4.5
 */

import { getPostCover } from "./getNewsCard";

/**
 * @description 解析单个帖子
 * @since Beta v0.4.5
 * @param {TGApp.Plugins.Mys.Post.FullData} post 帖子
 * @returns {TGApp.Plugins.Mys.Forum.RenderCard} 渲染用帖子
 */
export function getPostCard(
  post: TGApp.Plugins.Mys.Post.FullData,
): TGApp.Plugins.Mys.Forum.RenderCard {
  return {
    title: post.post.subject,
    cover: getPostCover(post),
    postId: post.post.post_id,
    subtitle: post.post.post_id,
    user: post.user,
    forum: {
      name: post.forum.name,
      icon: post.forum.icon,
    },
    data: {
      mark: post.stat.bookmark_num,
      forward: post.stat.forward_num,
      like: post.stat.like_num,
      reply: post.stat.reply_num,
      view: post.stat.view_num,
    },
  };
}

/**
 * @description 获取渲染用帖子数据
 * @since Beta v0.3.7
 * @param {TGApp.Plugins.Mys.Forum.FullData} posts
 * @returns {TGApp.Plugins.Mys.Forum.RenderCard[]}
 */
export function getPostsCard(
  posts: TGApp.Plugins.Mys.Forum.FullData,
): TGApp.Plugins.Mys.Forum.RenderCard[] {
  const postsCard: TGApp.Plugins.Mys.Forum.RenderCard[] = [];
  posts.list.map((post) => {
    return postsCard.push(getPostCard(post));
  });
  return postsCard;
}
