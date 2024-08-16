/**
 * @file types/BBS/Navigator.d.ts
 * @description BBS 导航相关类型定义文件
 * @since Beta v0.3.7
 */

/**
 * @description 导航相关类型定义
 * @since Beta v0.3.7
 * @namespace TGApp.BBS.Navigator
 * @memberof TGApp.BBS
 */
declare namespace TGApp.BBS.Navigator {
  /**
   * @description 导航列表返回响应类型
   * @interface HomeResponse
   * @since Beta v0.3.7
   * @extends TGApp.BBS.Response.BaseWithData
   * @property {HomeData} data - 导航列表数据
   * @return HomeResponse
   */
  interface HomeResponse extends TGApp.BBS.Response.BaseWithData {
    data: HomeData;
  }

  /**
   * @description 导航列表数据
   * @interface HomeData
   * @since Beta v0.3.7
   * @property {Navigator[]} navigator - 导航列表
   * @property {Disscussion} discussion - 讨论区
   * @property {Background} background - 背景
   * @property {Official} official - 官方
   * @property {Carousels} carousels - 轮播图
   * @property {HotTopic[]} hot_topics - 热门话题
   * @property {GameReception[]} game_receptions - 游戏接待
   * @property {unknown[]} posts - 帖子
   * @property {unknown[]} lives - 直播
   * @property {unknown} recommend_villa - 推荐别墅
   * @property {unknown[]} image_post_card - 图片帖子卡片
   * @return HomeData
   */
  interface HomeData {
    navigator: Navigator[];
    discussion: Disscussion;
    background: Background;
    official: Official;
    carousels: Carousels;
    hot_topics: HotTopic[];
    game_receptions: GameReception[];
    posts: unknown[];
    lives: unknown[];
    recommend_villa: unknown;
    image_post_card: unknown[];
  }

  /**
   * @description 导航列表
   * @interface Navigator
   * @since Beta v0.3.7
   * @property {number} id - 导航 id
   * @property {string} name - 导航名称
   * @property {string} icon - 导航图标
   * @property {string} app_path - 导航路径
   * @property {number} reddot_online_item - 红点在线项目
   * @return Navigator
   */
  interface Navigator {
    id: number;
    name: string;
    icon: string;
    app_path: string;
    reddot_online_item: number;
  }

  /**
   * @description 讨论区
   * @interface Disscussion
   * @since Beta v0.3.7
   * @property {string} icon - 讨论区图标
   * @property {string} title - 讨论区标题
   * @property {string} prompt - 讨论区提示
   * @return Disscussion
   */
  interface Disscussion {
    icon: string;
    title: string;
    prompt: string;
  }

  /**
   * @description 背景
   * @interface Background
   * @since Beta v0.3.7
   * @property {string} image - 背景图片
   * @property {string} color - 背景颜色
   * @return Background
   */
  interface Background {
    image: string;
    color: string;
  }

  /**
   * @description 官方
   * @interface Official
   * @since Beta v0.3.7
   * @property {number} position - 官方位置
   * @property {number} forum_id - 官方论坛 id
   * @property {string} data[].post_id - 官方帖子 id
   * @property {string} data[].title - 官方帖子标题
   * @property {string} data[].date - 官方帖子日期（时间戳，单位：秒）
   * @property {string} data[].label - 官方帖子标签
   * @property {boolean} data[].is_top - 官方帖子是否置顶
   * @property {number} data[].view_type - 官方帖子视图类型
   * @property {string} data[].image_url - 官方帖子图片 url
   * @return Official
   */
  interface Official {
    position: number;
    forum_id: number;
    data: Array<{
      post_id: string;
      title: string;
      date: string;
      label: string;
      is_top: boolean;
      view_type: number;
      image_url: string;
    }>;
  }

  /**
   * @description 轮播图
   * @interface Carousels
   * @since Beta v0.3.7
   * @property {number} position - 轮播图位置
   * @property {string} data[].cover - 轮播图封面
   * @property {string} data[].app_path - 轮播图路径
   * @return Carousels
   */
  interface Carousels {
    position: number;
    data: Array<{
      cover: string;
      app_path: string;
    }>;
  }

  /**
   * @description 热门话题
   * @interface HotTopic
   * @since Beta v0.3.7
   * @property {number} position - 热门话题位置
   * @property {number} data[].topic_id - 热门话题 id
   * @property {string} data[].image - 热门话题图片
   * @property {string} data[].topic_name - 热门话题名称
   * @property {string} data[].post_name - 热门话题帖子名称
   * @property {number} data[].count.view - 热门话题浏览数
   * @property {number} data[].count.discuss - 热门话题讨论数
   * @return HotTopic
   */
  interface HotTopic {
    position: number;
    data: Array<{
      topic_id: number;
      image: string;
      topic_name: string;
      post_name: string;
      count: {
        view: number;
        discuss: number;
      };
    }>;
  }

  /**
   * @description 游戏接待
   * @interface GameReception
   * @since Beta v0.3.7
   * @property {number} position - 游戏接待位置
   * @property {number} data.config.id - 游戏接待 id
   * @property {number} data.config.game_id - 游戏接待游戏 id
   * @property {string} data.config.name - 游戏接待名称
   * @property {string} data.config.description - 游戏接待描述
   * @property {string} data.config.icon - 游戏接待图标
   * @property {string} data.config.status - 游戏接待状态
   * @property {number} data.config.rules.game_level - 游戏接待规则游戏等级
   * @property {number} data.config.rules.community_level - 游戏接待规则社区等级
   * @property {number} data.config.questionnaire.questionnaire_type - 游戏接待问卷类型
   * @property {string} data.config.questionnaire.questionnaire_url - 游戏接待问卷 url
   * @property {number} data.config.questionnaire.questionnaire_status - 游戏接待问卷状态
   * @property {string} data.config.pkg.android_url - 游戏接待安卓包 url
   * @property {string} data.config.pkg.pkg_name - 游戏接待安卓包名称
   * @property {string} data.config.pkg.pkg_version - 游戏接待安卓包版本
   * @property {string} data.config.pkg.ios_url - 游戏接待 ios 包 url
   * @property {string} data.config.pkg.pkg_length - 游戏接待 ios 包大小
   * @property {string} data.config.pkg.pkg_md5 - 游戏接待 ios 包 md5
   * @property {string} data.config.pkg.pkg_version_code - 游戏接待 ios 包版本
   * @property {string} data.config.pkg.ios_version - 游戏接待 ios 版本
   * @property {string} data.config.pkg.new_filename - 游戏接待 ios 包新文件名
   * @property {string} data.config.pkg.filename - 游戏接待 ios 包文件名
   * @property {string} data.config.pkg.pkg_version_name - 游戏接待 ios 包版本名称
   * @property {number} data.config.detail_servlet.type - 游戏接待详情类型
   * @property {unknown} data.config.detail_servlet.normal_servlet - 游戏接待详情普通类型
   * @property {unknown} data.config.detail_servlet.customize_detail - 游戏接待详情自定义类型
   * @property {boolean} data.config.pre_register_count.show_count - 游戏接待预注册是否显示数量
   * @property {string} data.config.pre_register_count.count - 游戏接待预注册数量
   * @property {boolean} data.config.is_top - 游戏接待是否置顶
   * @property {string} data.config.last_update_time - 游戏接待最后更新时间
   * @property {number} data.config.app_store_switch - 游戏接待 app store 开关
   * @property {number} data.config.download_switch - 游戏接待下载开关
   * @property {string} data.config.developer - 游戏接待开发商
   * @property {unknown} data.user_status - 游戏接待用户状态
   * @return GameReception
   */
  interface GameReception {
    position: number;
    data: {
      config: {
        id: number;
        game_id: number;
        name: string;
        description: string;
        icon: string;
        status: string;
        rules: {
          game_level: number;
          community_level: number;
        };
        questionnaire: {
          questionnaire_type: number;
          questionnaire_url: string;
          questionnaire_status: number;
        };
        pkg: {
          android_url: string;
          pkg_name: string;
          pkg_version: string;
          ios_url: string;
          pkg_length: string;
          pkg_md5: string;
          pkg_version_code: string;
          ios_version: string;
          new_filename: string;
          filename: string;
          pkg_version_name: string;
        };
        detail_servlet: {
          type: number;
          normal_servlet: unknown;
          customize_detail: unknown;
        };
        pre_register_count: {
          show_count: boolean;
          count: string;
        };
        is_top: boolean;
        last_update_time: string;
        app_store_switch: number;
        download_switch: number;
        developer: string;
      };
      user_status: unknown;
    };
  }

  /**
   * @description 兑换码接口返回数据
   * @interface CodeResponse
   * @since Beta v0.5.3
   * @extends TGApp.BBS.Response.BaseWithData
   * @property {CodeData[]} data.code_list - 兑换码数据
   * @return CodeResponse
   */
  interface CodeResponse extends TGApp.BBS.Response.BaseWithData {
    data: {
      code_list: CodeData[];
    };
  }

  /**
   * @description 兑换码数据
   * @interface CodeData
   * @since Beta v0.5.3
   * @property {string} title - 兑换码标题，为html字符串
   * @property {string} code - 兑换码
   * @property {string} img - 兑换码图片
   * @property {string} to_get_time - 过期时间，时间戳（单位：秒）
   * @return CodeData
   */
  interface CodeData {
    title: string;
    code: string;
    img: string;
    to_get_time: string;
  }
}
