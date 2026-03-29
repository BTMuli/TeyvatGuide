/**
 * 游戏配置文件相关
 * @since Beta v0.9.9
 */

declare namespace TGApp.Game.Config {
  /**
   * Config.ini 文件
   * @since Beta v0.9.9
   */
  type GameConf = {
    /** 通用配置 */
    general: GeneralConf;
  };

  /**
   * Config.ini 配置
   * @since Beta v0.9.9
   */
  type GeneralConf = {
    /** channel */
    channel: string;
    /** cps */
    cps: string;
    /** downloading_mode */
    downloading_mode: string;
    /** game_version */
    game_version: string;
    /** plugin_sdk_version */
    plugin_sdk_version: string;
    /** sub_channel */
    sub_channel: string;
    /**
     * uapc
     * @remarks 序列化的JSON字符串
     */
    uapc: string;
    /** wpf_version */
    wpf_version: string;
  };
}
