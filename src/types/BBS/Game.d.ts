/**
 * 游戏相关的类型定义
 * @since Beta v0.7.2
 */

declare namespace TGApp.BBS.Game {
  /**
   * 游戏列表返回
   * @since Beta v0.6.8
   */
  type ListResp = TGApp.BBS.Response.BaseWithData & {
    /** 游戏列表数据 */
    data: {
      /** 游戏列表 */
      list: Array<Item>;
    };
  };

  /**
   * 游戏列表项
   * @since Beta v0.6.8
   */
  type Item = {
    /** 游戏 ID */
    id: number;
    /** 游戏名称 */
    name: string;
    /** 游戏英文名称 */
    en_name: string;
    /** 游戏图标（App 用） */
    app_icon: string;
    /** 游戏图标 */
    icon: string;
    /** 搜索热词 */
    search_trend_word: string;
    /** 游戏等级图标 */
    level_image: string;
    /** 游戏等级文字颜色 */
    level_text_color: string;
    /** 游戏话题数 */
    topic_num: number;
    /** 运营名称 */
    op_name: string;
    /** 主色调（如 AB9756） */
    main_color: string;
    /** 是否有百科 */
    has_wiki: boolean;
    /** 游戏分类配置 */
    game_sort_config: Array<unknown>;
  };

  /**
   * 游戏账号返回
   * @since Beta v0.7.2
   */
  type AccountResp = TGApp.BBS.Response.BaseWithData<AccountRes>;

  /**
   * 游戏账号数据
   * @since Beta v0.7.2
   */
  type AccountRes = {
    /** 游戏账号列表 */
    list: Array<Account>;
  };

  /**
   * 游戏账号类型
   * @since Beta v0.7.2
   */
  type Account = {
    /** 游戏 biz，例如 hk4e_cn */
    game_biz: string;
    /** 游戏 UID */
    game_uid: string;
    /** 是否为当前选中账号 */
    is_chosen: boolean;
    /** 是否为官服账号 */
    is_official: boolean;
    /** 游戏等级 */
    level: string;
    /** 游戏昵称 */
    nickname: string;
    /** 游戏区域 */
    region: string;
    /** 游戏区域名称 */
    region_name: string;
  };
}
