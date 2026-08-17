/**
 * 应用层 SQLite 相关类型定义
 * @since Beta v0.11.5
 */

declare namespace TGApp.App.Sqlite {
  /**
   * 事务 SQL 语句
   * @since Beta v0.11.5
   */
  type SqlStatement = {
    /** SQL 语句 */
    query: string;
    /** 绑定参数 */
    values?: Array<unknown>;
  };
}
