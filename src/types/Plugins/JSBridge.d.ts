/**
 * JSBridge 插件相关类型定义文件
 * @since Beta v0.8.4
 */

declare namespace TGApp.Plugins.JSBridge {
  /**
   * JSBridge 通用 arg 参数
   * @since Beta v0.3.9
   */
  type Arg<T> = {
    /** 方法名 */
    method: string;
    /** 参数 */
    payload: T;
    /** 回调函数名 */
    callback: string;
  };

  /**
   * 通用 arg 参数-无参数
   * @since Beta v0.3.9
   */
  type NullArg = Arg<null>;

  /**
   * configShare 方法参数
   * @since Beta v0.3.9
   */
  type ConfigSharePayload = {
    /** 是否启用分享 */
    enable: boolean;
  };

  /**
   * eventTrack 方法参数
   * @since Beta v0.3.9
   */
  type EventTrackPayload = {
    /** 页面信息 */
    pageInfo: {
      /** 页面路径 */
      page_path: string;
      /** 页面名称 */
      page_name: string;
      /** 子页面路径 */
      sub_page_path: string;
      /** 子页面名称 */
      sub_page_name: string;
      /** 来源页面路径 */
      source_path: string;
      /** 来源页面名称 */
      source_name: string;
      /** 页面 ID */
      page_id: string;
      /** 页面类型 */
      page_type: string;
      /** 来源 ID */
      source_id: string;
      /** 额外信息 */
      extra_info: unknown;
    };
    /** 事件信息 */
    eventInfo: {
      /** 事件发生时间 */
      time: string;
      /** 事件 ID */
      action_id: number;
      /** 按钮名称 */
      btn_name: string;
      /** 模块 ID */
      module_id: string;
      /** 模块名称 */
      module_name: string;
      /** 额外信息 */
      extra_info: unknown;
    };
    /** 公共信息 */
    commonInfo: {
      /** 额外信息 */
      extra_info: {
        /** 游戏 ID */
        game_id: string;
        /** 视图类型 */
        view_type: string;
      };
    };
  };

  /**
   * getActionTicket 方法参数
   * @since Beta v0.3.9
   */
  type GetActionTicketPayload = {
    /** 行为类型 */
    action_type: string;
  };

  /**
   * genAuthkey 方法参数
   * @since Beta v0.3.9
   */
  type GenAuthkeyPayload = Record<string, string>;

  /**
   * getCookieToken 方法参数
   * @since Beta v0.3.9
   */
  type GetCookieTokenPayload = {
    /** 是否强制刷新 */
    forceRefresh: boolean;
  };

  /**
   * getDS2 方法参数
   * @since Beta v0.3.9
   */
  type GetDS2Payload = {
    /** 查询参数 */
    query: Record<string, string | number> | string;
    /** 请求体 */
    body: Record<string, string | number> | string;
  };

  /**
   * onClickImg 方法参数
   * @since Beta v0.3.9
   */
  type OnClickImgPayload = {
    /** 图片列表 */
    image_list: Array<{
      /** 图片链接 */
      url: string;
      /** 图片格式 */
      format: string;
    }>;
  };

  /**
   * openApplication 方法参数
   * @since Beta v0.3.9
   */
  type OpenApplicationPayload = {
    /** 游戏中心对应 id */
    gameCenterId: number;
  };

  /**
   * openSystemBrowser 方法参数
   * @since Beta v0.6.0
   */
  type OpenSystemBrowserPayload = {
    /** 打开的链接 */
    open_url: string;
  };

  /**
   * pushPage 方法参数
   * @since Beta v0.3.9
   */
  type PushPagePayload = {
    /** 页面地址 */
    page: string;
  };

  /**
   * setPresentationStyle 方法参数
   * @since Beta v0.3.9
   */
  type SetPresentationStylePayload = {
    /** 窗口样式 */
    style: string;
    /** 导航栏 */
    navigationBar: unknown;
    /** 状态栏模式 */
    statusBar: {
      /** 状态栏模式 */
      style: string;
    };
  };

  /**
   * share 方法参数
   * @since Beta v0.3.9
   */
  type SharePayload = SharePayloadDefault | SharePayloadScreenshot | SharePayloadImage;

  /**
   * share 方法参数-默认分享
   * @since Beta v0.8.4
   */
  type SharePayloadDefault = {
    /** 分享类型，默认值"default" */
    type: "default";
    /** 分享内容 */
    content: {
      /** 标题 */
      title: string;
      /** 描述 */
      description: string;
      /** 链接 */
      link: string;
      /** 图片链接 */
      image_url: string;
    };
  };

  /**
   * share 方法参数-截图分享
   * @since Beta v0.8.4
   */
  type SharePayloadScreenshot = {
    /** 分享类型，值为"screenshot" */
    type: "screenshot";
    /** 分享内容 */
    content: {
      /** 是否预览 */
      preview: boolean;
    };
  };

  /**
   * share 方法参数-图片分享
   * @since Beta v0.8.4
   */
  type SharePayloadImage = {
    /** 分享类型，值为"image" */
    type: "image";
    /** 分享内容 */
    content: {
      /** 图片链接（可选） */
      image_url?: string;
      /** 图片的 Base64 编码（可选） */
      image_base64?: string;
    };
  };

  /**
   * getRegionRoleInfo 方法参数
   * @since Beta v0.8.4
   */
  type GetRegionRoleInfoPayload = {
    /** 游戏 biz 标识 */
    game_biz: string;
  };
}
