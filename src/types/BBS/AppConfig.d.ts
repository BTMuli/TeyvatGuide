/**
 * @file types/BBS/AppConfig.d.ts
 * @description 米游社应用配置类型
 * @since Beta v0.8.2
 */

declare namespace TGApp.BBS.AppConfig {
  /**
   * @description 应用配置返回响应
   * @since Beta v0.8.2
   * @interface Resp
   * @extends TGApp.BBS.Response.BaseWithData
   * @property {FullRes} data 应用配置数据
   */
  type Resp = TGApp.BBS.Response.BaseWithData<FullRes>;

  /**
   * @description 应用配置数据
   * @since Beta v0.8.2
   * @interface FullRes
   * @property {FullData} config 应用配置
   */
  type FullRes = { config: FullData };

  /**
   * @description 应用配置
   * @since Beta v0.8.2
   * @interface FullData
   * @todo 只写了用到的部分
   * @property {string} game_uid_card_config 游戏 UID 卡片配置（序列化的 JSON 字符串）
   */
  type FullData = { game_uid_card_config: string };

  /**
   * @description 游戏 UID 卡片配置-整体
   * @since Beta v0.8.2
   * @interface GameUidCardFullConf
   * @property {Record<string, GameUidCardConf>} game_uid_card_conf 游戏 UID 卡片配置项，键为游戏 ID
   */
  type GameUidCardFullConf = { game_uid_card_conf: Record<string, GameUidCardConf> };

  /**
   * @description 游戏 UID 卡片配置-单个配置项
   * @since Beta v0.8.2
   * @interface GameUidCardConf
   * @property {string} main_text_color 主文本颜色
   * @property {boolean} is_open 是否开启
   * @property {string} background_color 背景颜色
   * @property {string} image_url 图片 URL
   */
  type GameUidCardConf = {
    main_text_color: string;
    is_open: boolean;
    background_color: string;
    image_url: string;
  };
}
