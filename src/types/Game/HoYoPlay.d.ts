/**
 * HoYoPlay 启动器接口类型。
 * @since Beta v0.12.0
 */

declare namespace TGApp.Game.HoYoPlay {
  /**
   * 启动器背景类型。
   * @since Beta v0.12.0
   */
  const BackgroundType = <const>{
    /** 静态图 */
    UNSPECIFIED: "BACKGROUND_TYPE_UNSPECIFIED",
    /** 视频背景 */
    VIDEO: "BACKGROUND_TYPE_VIDEO",
    /** 海报图 */
    POSTER: "BACKGROUND_TYPE_POSTER",
    /** 自定义本地文件 */
    CUSTOM: "BACKGROUND_TYPE_CUSTOM",
  };

  /**
   * 启动器背景类型值。
   * @since Beta v0.12.0
   */
  type BackgroundTypeEnum = (typeof BackgroundType)[keyof typeof BackgroundType];

  /**
   * HoYoPlay 游戏标识。
   * @since Beta v0.12.0
   */
  type GameId = {
    /** 游戏 ID */
    id: string;
    /** 游戏 biz */
    biz: string;
  };

  /**
   * 启动器图片资源。
   * @since Beta v0.12.0
   */
  type GameImage = {
    /** 资源地址 */
    url: string;
    /** 悬停图地址 */
    hover_url?: string;
    /** 点击后打开的链接 */
    link?: string;
    /** 打开链接时是否带登录态 */
    login_state_in_link?: boolean;
    /** 资源校验值 */
    md5?: string;
    /** 资源大小 */
    size?: number;
  };

  /**
   * 单张启动器背景。
   * @since Beta v0.12.0
   */
  type Background = {
    /** 背景 ID */
    id: string;
    /** 背景图 */
    background: GameImage;
    /** 版本亮点图标 */
    icon?: GameImage;
    /** 视频背景；仅 url 有效 */
    video?: GameImage;
    /** 视频背景上的叠加图 */
    theme?: GameImage;
    /** 背景类型 */
    type: BackgroundTypeEnum;
  };

  /**
   * 单个游戏的背景列表。
   * @since Beta v0.12.0
   */
  type BackgroundInfo = {
    /** 游戏标识 */
    game: GameId;
    /** 可轮换背景 */
    backgrounds: Array<Background>;
  };

  /**
   * 启动器背景接口数据。
   * @since Beta v0.12.0
   */
  type BackgroundData = {
    /** 各游戏背景列表 */
    game_info_list: Array<BackgroundInfo>;
  };

  /**
   * 启动器背景接口响应。
   * @since Beta v0.12.0
   */
  type BackgroundResp = TGApp.BBS.Response.BaseWithData<BackgroundData>;
}
