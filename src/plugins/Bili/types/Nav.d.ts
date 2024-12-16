/**
 * @file plugins/Bili/types/Nav.d.ts
 * @description Bili 插件导航类型定义文件
 * @since Beta v0.5.7
 */

declare namespace TGApp.Plugins.Bili.Nav {
  /**
   * @description Bili 导航基本信息返回
   * @since Beta v0.5.7
   * @interface Response
   * @extends {TGApp.Plugins.Bili.Base.Response}
   * @property {Data} data 导航基本信息
   * @return NavResponse
   */
  type Response = TGApp.Plugins.Bili.Base.Response & { data: Data };

  /**
   * @description Bili 导航基本信息
   * @since Beta v0.5.7
   * @interface Data
   * @see https://api.bilibili.com/x/web-interface/nav
   * @desc 只写了用到的部分
   * @property {string} wbi_img.img_url 网站图标
   * @property {string} wbi_img.sub_url 网站图标（小）
   * @return Data
   */
  type Data = { wbi_img: { img_url: string; sub_url: string } };
}
