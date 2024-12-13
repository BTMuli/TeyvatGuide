/**
 * @file plugins/Mys/utils/getPositionCard.ts
 * @description Mys 插件热点追踪工具
 * @since Beta v0.6.6
 */

/**
 * @description 根据热点追踪信息转为渲染用的数据
 * @since Beta v0.6.6
 * @param {TGApp.Plugins.Mys.Position.Data[]} positionData 列表
 * @returns {TGApp.Plugins.Mys.Position.RenderCard[]} 返回列表
 */
function getPositionCard(
  positionData: TGApp.Plugins.Mys.Position.Data[],
): TGApp.Plugins.Mys.Position.RenderCard[] {
  const res: TGApp.Plugins.Mys.Position.RenderCard[] = [];
  for (const position of positionData) {
    let link = position.url;
    if (position.url === "" && position.content_id !== 0) {
      link = `https://bbs.mihoyo.com/ys/obc/content/${position.content_id}/detail?bbs_presentation_style=no_header`;
    }
    const startTs = new Date(position.create_time).getTime();
    const endTs = Number(position.end_time);
    const card: TGApp.Plugins.Mys.Position.RenderCard = {
      title: position.title,
      postId: position.url !== "" ? Number(position.url.split("/").pop()) : position.content_id,
      link: link,
      icon: position.icon,
      abstract: position.abstract,
      time: { startStamp: startTs, endStamp: endTs, totalStamp: endTs - startTs },
    };
    res.push(card);
  }
  return res;
}

export default getPositionCard;
