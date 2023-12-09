/**
 * @file plugins/Mys/utils/getPostsCard.ts
 * @description Mys 插件帖子渲染
 * @since Beta v0.3.7
 */

const defaultCover = "/source/UI/defaultCover.webp";

/**
 * @description 解析单个帖子
 * @since Beta v0.3.7
 * @param {TGApp.Plugins.Mys.News.Item} post 帖子
 * @returns {TGApp.Plugins.Mys.Forum.RenderCard} 渲染用帖子
 */
function getPostCard(post: TGApp.Plugins.Mys.News.Item): TGApp.Plugins.Mys.Forum.RenderCard {
  const postCover = post.cover?.url || post.post.cover || post.post.images[0] || defaultCover;
  const userLabel = getUserLabel(post);
  return {
    title: post.post.subject,
    cover: postCover,
    postId: Number(post.post.post_id),
    subtitle: post.post.post_id,
    user: {
      nickname: post.user.nickname,
      pendant: post.user.pendant,
      icon: post.user.avatar_url,
      label: userLabel,
    },
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
 * @description 获取用户描述
 * @since Beta v0.3.7
 * @param {TGApp.Plugins.Mys.News.Item} post 帖子
 * @returns {string} 描述
 */
function getUserLabel(post: TGApp.Plugins.Mys.News.Item): string {
  if (post.user.certification.label !== "") {
    return post.user.certification.label;
  }
  return post.user.introduce;
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
