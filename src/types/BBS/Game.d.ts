/**
 * @file types/BBS/Game.d.ts
 * @description 游戏相关的类型定义
 * @since Beta v0.7.2
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

  /**
   * @description 游戏账号返回
   * @since Beta v0.7.2
   * @interface AccountResp
   * @extends TGApp.BBS.Response.BaseWithData
   * @property {AccountRes} data 游戏账号数据
   * @return AccountResp
   */
  type AccountResp = TGApp.BBS.Response.BaseWithData<AccountRes>;

  /**
   * @description 游戏账号数据
   * @since Beta v0.7.2
   * @interface AccountRes
   * @property {Array<Account>} list 游戏账号列表
   * @return AccountRes
   */
  type AccountRes = { list: Array<Account> };

  /**
   * @description 游戏账号类型
   * @since Beta v0.7.2
   * @interface Account
   * @property {string} game_biz 游戏 biz，例如 hk4e_cn
   * @property {string} game_uid 游戏 uid
   * @property {boolean} is_chosen 是否为当前选中账号
   * @property {boolean} is_official 是否为官服账号
   * @property {string} level 游戏等级
   * @property {string} nickname 游戏昵称
   * @property {string} region 游戏区域
   * @property {string} region_name 游戏区域名称
   * @return Account
   */
  type Account = {
    game_biz: string;
    game_uid: string;
    is_chosen: boolean;
    is_official: boolean;
    level: string;
    nickname: string;
    region: string;
    region_name: string;
  };
}
