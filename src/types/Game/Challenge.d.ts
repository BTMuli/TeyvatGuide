/**
 * @file types/Game/Challenge.d.ts
 * @description 幽境危战相关类型定义文件
 * @since Beta v0.8.0
 */

declare namespace TGApp.Game.Challenge {
  /**
   * @description 幽境危战赋光之人列表返回响应
   * @since Beta v0.8.0
   * @interface PopularityResp
   * @extends TGApp.BBS.Response.BaseWithData<PopularityRes>
   */
  type PopularityResp = TGApp.BBS.Response.BaseWithData<PopularityRes>;

  /**
   * @description 幽境危战赋光之人列表数据
   * @since Beta v0.8.0
   * @interface PopularityRes
   * @property {Array<PopularityItem>} avatar_list - 赋光之人列表
   */
  type PopularityRes = { avatar_list: Array<PopularityItem> };

  /**
   * @description 幽境危战赋光之人列表项
   * @since Beta v0.8.0
   * @interface PopularityItem
   * @property {number} avatar_id - 角色 ID
   * @property {string} name - 角色名称
   * @property {string} element - 角色元素
   * @property {string} image - 角色头像图片 URL
   * @property {number} rarity - 角色稀有度
   */
  type PopularityItem = {
    avatar_id: number;
    name: string;
    element: string;
    image: string;
    rarity: number;
  };
}
