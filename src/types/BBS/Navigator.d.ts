/**
 * 米社导航相关类型
 * @since Beta v0.3.7
 */

declare namespace TGApp.BBS.Navigator {
  /**
   * 导航列表返回响应类型
   * @since Beta v0.3.7
   */
  type HomeResp = TGApp.BBS.Response.BaseWithData<HomeData>;
  /**
   * 导航列表数据
   * @since Beta v0.3.7
   */
  type HomeData = {
    /** 导航列表 */
    navigator: Array<Navigator>;
    /** 讨论区 */
    discussion: Disscussion;
    /** 背景 */
    background: Background;
    /** 官方 */
    official: Official;
    /** 轮播图 */
    carousels: Carousels;
    /** 热门话题 */
    hot_topics: Array<HotTopic>;
    /** 游戏接待 */
    game_receptions: Array<GameReception>;
    /** 帖子 */
    posts: Array<unknown>;
    /** 直播 */
    lives: Array<unknown>;
    /** 推荐别墅 */
    recommend_villa: unknown;
    /** 图片帖子卡片 */
    image_post_card: Array<unknown>;
  };

  /**
   * 导航列表
   * @since Beta v0.3.7
   */
  type Navigator = {
    /** 导航 ID */
    id: number;
    /** 导航名称 */
    name: string;
    /** 导航图标 */
    icon: string;
    /** 导航路径 */
    app_path: string;
    /** 红点在线项目 */
    reddot_online_item: number;
  };

  /**
   * 讨论区
   * @since Beta v0.3.7
   */
  type Disscussion = {
    /** 讨论区图标 */
    icon: string;
    /** 讨论区标题 */
    title: string;
    /** 讨论区提示 */
    prompt: string;
  };

  /**
   * 背景
   * @since Beta v0.3.7
   */
  type Background = {
    /** 背景图片 */
    image: string;
    /** 背景颜色 */
    color: string;
  };

  /**
   * 官方
   * @since Beta v0.3.7
   */
  type Official = {
    /** 官方位置 */
    position: number;
    /** 官方论坛 ID */
    forum_id: number;
    /** 官方帖子列表 */
    data: Array<{
      /** 帖子 ID */
      post_id: string;
      /** 帖子标题 */
      title: string;
      /** 帖子日期（时间戳，单位：秒） */
      date: string;
      /** 帖子标签 */
      label: string;
      /** 是否置顶 */
      is_top: boolean;
      /** 视图类型 */
      view_type: number;
      /** 图片 URL */
      image_url: string;
    }>;
  };

  /**
   * 轮播图
   * @since Beta v0.3.7
   */
  type Carousels = {
    /** 轮播图位置 */
    position: number;
    /** 轮播图数据 */
    data: Array<{
      /** 封面 */
      cover: string;
      /** 路径 */
      app_path: string;
    }>;
  };

  /**
   * 热门话题
   * @since Beta v0.3.7
   */
  type HotTopic = {
    /** 热门话题位置 */
    position: number;
    /** 热门话题数据 */
    data: Array<{
      /** 话题 ID */
      topic_id: number;
      /** 图片 */
      image: string;
      /** 话题名称 */
      topic_name: string;
      /** 帖子名称 */
      post_name: string;
      /** 浏览与讨论数 */
      count: {
        /** 浏览数 */
        view: number;
        /** 讨论数 */
        discuss: number;
      };
    }>;
  };

  /**
   * 游戏接待
   * @since Beta v0.3.7
   */
  type GameReception = {
    /** 游戏接待位置 */
    position: number;
    /** 游戏接待数据 */
    data: {
      config: {
        /** 游戏接待 ID */
        id: number;
        /** 游戏 ID */
        game_id: number;
        /** 游戏接待名称 */
        name: string;
        /** 游戏接待描述 */
        description: string;
        /** 游戏接待图标 */
        icon: string;
        /** 游戏接待状态 */
        status: string;
        /** 游戏接待规则 */
        rules: {
          /** 游戏等级要求 */
          game_level: number;
          /** 社区等级要求 */
          community_level: number;
        };
        /** 游戏接待问卷信息 */
        questionnaire: {
          /** 问卷类型 */
          questionnaire_type: number;
          /** 问卷链接 */
          questionnaire_url: string;
          /** 问卷状态 */
          questionnaire_status: number;
        };
        /** 游戏接待安装包信息 */
        pkg: {
          /** 安卓包链接 */
          android_url: string;
          /** 包名称 */
          pkg_name: string;
          /** 包版本 */
          pkg_version: string;
          /** iOS 包链接 */
          ios_url: string;
          /** 包大小 */
          pkg_length: string;
          /** 包 MD5 */
          pkg_md5: string;
          /** 包版本号 */
          pkg_version_code: string;
          /** iOS 版本 */
          ios_version: string;
          /** 新文件名 */
          new_filename: string;
          /** 文件名 */
          filename: string;
          /** 包版本名称 */
          pkg_version_name: string;
        };
        /** 游戏接待详情配置 */
        detail_servlet: {
          /** 详情类型 */
          type: number;
          /** 普通详情 */
          normal_servlet: unknown;
          /** 自定义详情 */
          customize_detail: unknown;
        };
        /** 预注册信息 */
        pre_register_count: {
          /** 是否显示数量 */
          show_count: boolean;
          /** 预注册数量 */
          count: string;
        };
        /** 是否置顶 */
        is_top: boolean;
        /** 最后更新时间 */
        last_update_time: string;
        /** App Store 开关 */
        app_store_switch: number;
        /** 下载开关 */
        download_switch: number;
        /** 开发商 */
        developer: string;
      };
      /** 用户状态 */
      user_status: unknown;
    };
  };

  /**
   * 兑换码返回响应
   * @since Beta v0.5.3
   */
  type CodeResp = TGApp.BBS.Response.BaseWithData<CodeRes>;

  /**
   * 兑换码返回
   * @since Beta v0.9.1
   */
  type CodeRes = {
    /** 兑换码列表 */
    code_list: Array<CodeData>;
  };

  /**
   * 兑换码
   * @since Beta v0.5.3
   */
  type CodeData = {
    /**
     * 兑换码标题
     * @remarks htmlText
     */
    title: string;
    /** 兑换码 */
    code: string;
    /** 图片 */
    img: string;
    /** 获取时间 */
    to_get_time: string;
  };
}
