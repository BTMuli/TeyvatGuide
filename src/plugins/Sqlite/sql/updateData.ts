/**
 * @file plugins Sqlite sql updateData.ts
 * @description 更新数据
 * @author BTMuli <bt-muli@outlook.com>
 * @since Alpha v0.2.0
 */

/**
 * @description 导入UIAF数据
 * @since Alpha v0.1.5
 * @param {TGApp.Plugins.UIAF.Achievement[]} data
 * @returns {string[]} sql
 */
export function importUIAFData (data: TGApp.Plugins.UIAF.Achievement[]): string[] {
  const sqlRes: string[] = [];
  data.map((achievement) => {
    let sql;
    // 获取完成状态
    const isCompleted = achievement.status === 2 || achievement.status === 3;
    if (isCompleted) {
      const completedTime = new Date(achievement.timestamp * 1000).toISOString().replace("T", " ").slice(0, 19);
      sql = `
        UPDATE Achievements
        SET isCompleted = 1, completedTime = '${completedTime}', progress = ${achievement.current}, updated = datetime('now', 'localtime')
        WHERE id = ${achievement.id} AND (isCompleted = 0 OR completedTime != '${completedTime}' OR progress != ${achievement.current});
      `;
    } else {
      sql = `
        UPDATE Achievements
        SET progress = ${achievement.current}, updated = datetime('now', 'localtime')
        WHERE id = ${achievement.id} AND progress != ${achievement.current};
      `;
    }
    return sqlRes.push(sql);
  });
  return sqlRes;
}
