/**
 * @file types/App/Store.d.ts
 * @description 涉及store但是没有特定的store模块的类型定义文件
 * @since Beta v0.6.5
 */

declare namespace TGApp.App.Store {
  /**
   * @description 咨讯类型枚举
   * @since Beta v0.6.5
   * @enum {string}
   */
  enum NewsTypeEnum {
    notice = "1",
    activity = "2",
    news = "3",
  }

  /**
   * @description 咨讯类型枚举
   * @since Beta v0.6.5
   * @type {keyof typeof NewsTypeEnum}
   */
  type NewsType = keyof typeof NewsTypeEnum;
}
