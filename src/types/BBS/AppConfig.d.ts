/**
 * 米社应用配置类型
 * @since Beta v0.8.2
 */

declare namespace TGApp.BBS.AppConfig {
  /**
   * 应用配置返回响应
   * @since Beta v0.8.2
   */
  type Resp = TGApp.BBS.Response.BaseWithData<FullRes>;

  /**
   * 应用配置返回
   * @since Beta v0.8.2
   */
  type FullRes = {
    /** 应用配置 */
    config: FullData;
  };

  /**
   * 应用配置
   * @since Beta v0.8.2
   */
  type FullData = {
    /**
     * 游戏 UID 卡片配置
     * @remarks 序列化，反序列化后是 {@link GameUidCardConfigParse}
     */
    game_uid_card_config: string;
  };

  /**
   * 游戏 UID 卡片配置
   * @since Beta v0.8.2
   */
  type GameUidCardConfigParse = {
    /**
     * 游戏 UID 卡片配置项
     * @remarks 键为游戏 ID
     */
    game_uid_card_conf: Record<string, GameUidCardConf>;
  };

  /**
   * 游戏 UID 卡片配置
   * @since Beta v0.8.2
   */
  type GameUidCardConf = {
    /** 主文本颜色 */
    main_text_color: string;
    /** 是否开启 */
    is_open: boolean;
    /** 背景色 */
    background_color: string;
    /** 图片 URL */
    image_url: string;
  };
}
