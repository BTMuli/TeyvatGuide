/**
 * 本应用的名片类型定义
 * @since Beta v0.7.2
 */

declare namespace TGApp.App.NameCard {
  /**
   * 名片数据
   * @since Beta v0.7.2
   */
  type Item = {
    /** 名片ID */
    id: number;
    /** 名片名称 */
    name: string;
    /** 名片类型 */
    type: string;
    /** 名片描述 */
    desc: string;
    /** 名片来源 */
    source: string;
  };
}
