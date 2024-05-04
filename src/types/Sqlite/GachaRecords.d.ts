/**
 * @file types Sqlite GachaRecords.d.ts
 * @description 数据库抽卡记录相关类型定义文件
 * @author BTMuli <bt-muli@outlook.com>
 * @since Alpha v0.2.3
 */

declare namespace TGApp.Sqlite.GachaRecords {
  /**
   * @description 数据库-抽卡记录表
   * @since Alpha v0.2.3
   * @interface SingleTable
   * @property {string} id - 抽卡记录 ID
   * @property {string} uid - UID
   * @property {string} gachaType - 抽卡类型
   * @property {string} uigfType - UIGF 类型
   * @property {string} time - 抽卡时间
   * @property {string} itemId - 抽卡物品 ID
   * @property {string} name - 抽卡物品名称
   * @property {string} type - 抽卡物品类型
   * @property {string} rank - 抽卡物品星级
   * @property {string} count - 抽卡物品数量
   * @property {string} updated - 数据库更新时间
   * @return SingleTable
   */
  interface SingleTable {
    id: string;
    uid: string;
    gachaType: string;
    uigfType: string;
    time: string;
    itemId: string;
    name: string;
    type: string;
    rank: string;
    count: string;
    updated: string;
  }
}
