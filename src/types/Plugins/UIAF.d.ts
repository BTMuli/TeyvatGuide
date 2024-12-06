/**
 * @file types/Plugins/UIAF.d.ts
 * @description UIAF 插件类型定义文件
 * @since Beta v0.6.0
 */

/**
 * @description UIAF 插件类型命名空间
 * @namespace TGApp.Plugins.UIAF
 * @merberof TGApp.Plugins
 * @since Beta v0.6.0
 */
declare namespace TGApp.Plugins.UIAF {
  /**
   * @interface Data
   * @since Alpha v0.1.5
   * @description UIAF 成就数据
   * @property {Export} info UIAF 头部信息
   * @property {Achievement[]} list UIAF 成就列表
   * @return Data
   */
  interface Data {
    info: Export;
    list: Achievement[];
  }

  /**
   * @interface Export
   * @since Alpha v0.1.5
   * @description UIAF 头部信息
   * @property {string} export_app 导出的应用名称
   * @property {number} export_timestamp 导出时间戳，正确时间戳得乘以 1000
   * @property {string} export_app_version 导出的应用版本
   * @property {string} uiaf_version UIAF 版本
   * @return Export
   */
  interface Export {
    export_app: string;
    export_timestamp: number;
    export_app_version: string;
    uiaf_version: string;
  }

  /**
   * @interface Achievement
   * @since Alpha v0.1.5
   * @description UIAF 单个成就数据
   * @property {number} id 成就 ID
   * @property {number} timestamp 成就记录时间戳，正确时间戳得乘以 1000
   * @property {number} current 成就进度
   * @property {number} status 成就状态，0 为未完成，1 为已完成
   * @return Achievement
   */
  interface Achievement {
    id: number;
    timestamp: number;
    current: number;
    status: number;
  }
}
