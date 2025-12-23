/**
 * Bili 插件导航类型定义文件
 * @since Beta v0.5.7
 */

declare namespace TGApp.Plugins.Bili.Nav {
  /**
   * Bili 导航基本信息返回
   * @since Beta v0.5.7
   */
  type Response = TGApp.Plugins.Bili.Base.Resp<Data>;

  /**
   * Bili 导航基本信息
   * @since Beta v0.5.7
   * @see https://api.bilibili.com/x/web-interface/nav
   * @remarks 只写了用到的部分
   */
  type Data = {
    /** 网站图标 */
    wbi_img: {
      /** 网站图标 */
      img_url: string;
      /** 网站图标（小） */
      sub_url: string;
    };
  };
}
