/**
 * @file types/Plugins/JSBridge.d.ts
 * @description JSBridge 插件相关类型定义文件
 * @since Beta v0.3.9
 */

/**
 * @description JSBridge 插件相关类型命名
 * @since Beta v0.3.9
 * @namespace TGApp.Plugins.JSBridge
 * @memberof TGApp.Plugins
 */
declare namespace TGApp.Plugins.JSBridge {
  /**
   * @description JSBridge 通用 arg 参数
   * @since Beta v0.3.9
   * @interface Arg
   * @template T
   * @property {string} method - 方法名
   * @property {T} payload - 参数
   * @property {string} callback - 回调函数名
   * @return Arg
   */
  interface Arg<T> {
    method: string;
    payload: T;
    callback: string;
  }

  /**
   * @description 通用 arg 参数-无参数
   * @since Beta v0.3.9
   * @interface NullArg
   * @return NullArg
   */
  type NullArg = Arg<null>;

  /**
   * @description 通用 arg 参数-未知参数
   * @since Beta v0.3.9
   * @interface UnknownArg
   * @return UnknownArg
   */
  type UnknownArg = Arg<unknown>;

  /**
   * @description eventTrack 方法参数
   * @since Beta v0.3.9
   * @interface EventTrackPayload
   * @property {object} pageInfo - 页面信息
   * @property {string} pageInfo.page_path - 页面路径
   * @property {string} pageInfo.page_name - 页面名称
   * @property {string} pageInfo.sub_page_path - 子页面路径
   * @property {string} pageInfo.sub_page_name - 子页面名称
   * @property {string} pageInfo.source_path - 来源页面路径
   * @property {string} pageInfo.source_name - 来源页面名称
   * @property {string} pageInfo.page_id - 页面 ID
   * @property {string} pageInfo.page_type - 页面类型
   * @property {string} pageInfo.source_id - 来源 ID
   * @property {unknown} pageInfo.extra_info - 额外信息
   * @property {object} eventInfo - 事件信息
   * @property {string} eventInfo.time - 事件时间
   * @property {number} eventInfo.action_id - 事件 ID
   * @property {string} eventInfo.btn_name - 按钮名称
   * @property {string} eventInfo.module_id - 模块 ID
   * @property {string} eventInfo.module_name - 模块名称
   * @property {unknown} eventInfo.extra_info - 额外信息
   * @property {object} commonInfo - 公共信息
   * @property {object} commonInfo.extra_info - 额外信息
   * @property {string} commonInfo.extra_info.game_id - 游戏 ID
   * @property {string} commonInfo.extra_info.view_type - 视图类型
   * @return EventTrackPayload
   */
  interface EventTrackPayload {
    pageInfo: {
      page_path: string;
      page_name: string;
      sub_page_path: string;
      sub_page_name: string;
      source_path: string;
      source_name: string;
      page_id: string;
      page_type: string;
      source_id: string;
      extra_info: unknown;
    };
    eventInfo: {
      time: string;
      action_id: number;
      btn_name: string;
      module_id: string;
      module_name: string;
      extra_info: unknown;
    };
    commonInfo: {
      extra_info: {
        game_id: string;
        view_type: string;
      };
    };
  }

  /**
   * @description getActionTicket 方法参数
   * @since Beta v0.3.9
   * @interface GetActionTicketPayload
   * @property {string} action_type
   * @return GetActionTicketPayload
   */
  interface GetActionTicketPayload {
    action_type: string;
  }

  /**
   * @description genAuthkey 方法参数
   * @since Beta v0.3.9
   * @interface GenAuthkeyPayload
   * @return GenAuthkeyPayload
   */
  type GenAuthkeyPayload = Record<string, string>;

  /**
   * @description getCookieToken 方法参数
   * @since Beta v0.3.9
   * @interface GetCookieTokenPayload
   * @property {boolean} forceRefresh - 是否强制刷新
   * @return GetCookieTokenPayload
   */
  interface GetCookieTokenPayload {
    forceRefresh: boolean;
  }

  /**
   * @description getDS2 方法参数
   * @since Beta v0.3.9
   * @interface GetDS2Payload
   * @property {Record<string,string|number>|string} query - 查询参数
   * @property {Record<string,string|number>|string} body - 请求体
   * @return GetDS2Payload
   */
  interface GetDS2Payload {
    query: Record<string, string | number> | string;
    body: Record<string, string | number> | string;
  }

  /**
   * @description onClickImg 方法参数
   * @since Beta v0.3.9
   * @interface OnClickImgPayload
   * @property {Array<object>} image_list - 图片列表
   * @property {string} image_list[].url - 图片链接
   * @property {string} image_list[].format - 图片格式
   * @return OnClickImgPayload
   */
  interface OnClickImgPayload {
    image_list: Array<{
      url: string;
      format: string;
    }>;
  }

  /**
   * @description openApplication 方法参数
   * @since Beta v0.3.9
   * @interface OpenApplicationPayload
   * @property {number} gameCenterId - 游戏中心对应 id
   * @return OpenApplicationPayload
   */
  interface OpenApplicationPayload {
    gameCenterId: number;
  }

  /**
   * @description pushPage 方法参数
   * @since Beta v0.3.9
   * @interface PushPagePayload
   * @property {string} page - 页面地址
   * @return PushPagePayload
   */
  interface PushPagePayload {
    page: string;
  }

  /**
   * @description setPresentationStyle 方法参数
   * @since Beta v0.3.9
   * @interface SetPresentationStylePayload
   * @property {string} style - 窗口样式
   * @property {unknown} navigationBar - 导航栏
   * @property {string} statusBar.style - 状态栏模式
   * @return SetPresentationStylePayload
   */
  interface SetPresentationStylePayload {
    style: string;
    navigationBar: unknown;
    statusBar: {
      style: string;
    };
  }

  /**
   * @description share 方法参数
   * @since Beta v0.3.9
   * @interface SharePayload
   * @property {string} type - 分享类型 // screenshot
   * @property {object} content - 分享内容
   * @property {boolean} content?.preview - 是否预览
   * @return SharePayload
   */
  type SharePayload =
    | {
        type: "default";
        content: {
          title: string;
          description: string;
          link: string;
          image_url: string;
        };
      }
    | {
        type: "screenshot";
        content: {
          preview: boolean;
        };
      }
    | {
        type: "image";
        content: {
          image_url?: string;
          image_base64?: string;
        };
      };
}
