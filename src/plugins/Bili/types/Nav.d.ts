/**
 * @file plugins/Bili/types/Nav.d.ts
 * @description Bili 插件导航类型定义文件
 * @since Beta v0.4.0
 */

/**
 * @description Bili 插件导航类型
 * @since Beta v0.4.0
 * @namespace Nav
 * @memberof TGApp.Plugins.Bili
 */
declare namespace TGApp.Plugins.Bili.Nav {
  /**
   * @description Bili 导航基本信息返回
   * @since Beta v0.4.0
   * @interface NavResponse
   * @extends {TGApp.Plugins.Bili.Base.Response}
   * @property {NavData} data 导航基本信息
   * @return NavResponse
   */
  interface NavResponse extends TGApp.Plugins.Bili.Base.Response {
    data: NavData;
  }

  /**
   * @description Bili 导航基本信息
   * @since Beta v0.4.0
   * @interface NavData
   * @see https://api.bilibili.com/x/web-interface/nav
   * @desc 只写了用到的部分
   * @property {string} wbi_img.img_url 网站图标
   * @property {string} wbi_img.sub_url 网站图标（小）
   * @return NavData
   */
  interface NavData {
    wbi_img: {
      img_url: string;
      sub_url: string;
    };
  }
}
