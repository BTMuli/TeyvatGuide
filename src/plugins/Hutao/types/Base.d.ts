/**
 * @file src/plugins/Hutao/types/Base.d.ts
 * @description Hutao 插件基础类型定义文件
 * @since Beta v0.3.8
 */

/**
 * @description Hutao 插件基础类型
 * @since Beta v0.3.8
 * @namespace Base
 * @return Base
 */
declare namespace TGApp.Plugins.Hutao.Base {
  /**
   * @description Hutao Response 统一接口
   * @since Alpha v0.2.1
   * @interface Response
   * @property {number} retcode 状态码
   * @property {string} message 状态信息
   * @property {any} data 数据
   * @return Response
   */
  interface Response {
    retcode?: number;
    message?: string;
    data?: any;
  }

  /**
   * @description 武器类型枚举，英文-中文对照
   * @since Beta v0.3.8
   * @memberof TGApp.Plugins.Hutao.Base
   * @enum {string}
   * @property {string} sword 单手剑
   * @property {string} claymore 双手剑
   * @property {string} pole 长柄武器
   * @property {string} bow 弓
   * @property {string} catalyst 法器
   * @return WeaponTypeEnum
   */
  const enum WeaponType {
    sword = "单手剑",
    claymore = "双手剑",
    pole = "长柄武器",
    bow = "弓",
    catalyst = "法器",
  }
}
