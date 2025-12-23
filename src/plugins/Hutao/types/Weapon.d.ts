/**
 * 武器组件类型定义
 * @since Beta v0.4.1
 */
declare namespace TGApp.Plugins.Hutao.Weapon {
  /**
   * 精炼描述
   * @since Beta v0.3.9
   */
  type RhiAffix = {
    /** 精炼名称 */
    Name: string;
    /** 精炼等级与描述 */
    Descriptions: Array<{
      /** 精炼等级 */
      Level: number;
      /** 精炼效果描述 */
      Description: string;
    }>;
  };
}
