/**
 * @file types/BBS/Game.d.ts
 * @description 游戏相关的类型定义
 * @since Beta v0.6.8
 */

declare namespace TGApp.BBS.Game {
  /**
   * @description 游戏列表返回
   * @since Beta v0.6.8
   * @interface ListResp
   * @extends TGApp.BBS.Response.BaseWithData
   * @property {Array<Item>} data.list 游戏列表
   * @return ListResp
   */
  type ListResp = TGApp.BBS.Response.BaseWithData & { data: { list: Array<Item> } };

  /**
   * @description 游戏列表项
   * @since Beta v0.6.8
   * @interface Item
   * @property {number} id 游戏 ID
   * @property {string} name 游戏名称
   * @property {string} en_name 游戏英文名称
   * @property {string} app_icon 游戏图标
   * @property {string} icon 游戏图标
   * @property {string} search_trend_word 搜索热词
   * @property {string} level_image 游戏等级图标
   * @property {string} level_text_color 游戏等级文字颜色
   * @property {number} topic_num 游戏话题数
   * @property {string} op_name 运营名称
   * @property {string} main_color 主色调 AB9756
   * @property {boolean} has_wiki 是否有百科
   * @property {Array<unknown>} game_sort_config 游戏分类配置
   * @return Item
   */
  type Item = {
    id: number;
    name: string;
    en_name: string;
    app_icon: string;
    icon: string;
    search_trend_word: string;
    level_image: string;
    level_text_color: string;
    topic_num: number;
    op_name: string;
    main_color: string;
    has_wiki: boolean;
    game_sort_config: Array<unknown>;
  };
}
