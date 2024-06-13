/**
 * @file plugins/Sqlite/sql/updateData.ts
 * @description 更新数据
 * @since Beta v0.4.9
 */

import minifySql from "../../../utils/minifySql";

/**
 * @description 导入UIAF数据-单项
 * @since Beta v0.4.9
 * @param {TGApp.Plugins.UIAF.Achievement} data
 * @returns {string} sql
 */
export function importUIAFData(data: TGApp.Plugins.UIAF.Achievement): string[] {
  let sql;
  const isCompleted = data.status === 2 || data.status === 3;
  if (isCompleted) {
    const completedTime = new Date(data.timestamp * 1000)
      .toISOString()
      .replace("T", " ")
      .slice(0, 19);
    sql = `
        UPDATE Achievements
        SET isCompleted   = 1,
            completedTime = '${completedTime}',
            progress      = ${data.current},
            updated       = datetime('now', 'localtime')
        WHERE id = ${data.id}
          AND (isCompleted = 0 OR completedTime != '${completedTime}'
            OR progress != ${data.current});
    `;
  } else {
    sql = `
          UPDATE Achievements
          SET progress = ${data.current},
              updated  = datetime('now', 'localtime')
          WHERE id = ${data.id}
            AND progress != ${data.current};
      `;
  }
  return minifySql(sql);
}

/**
 * @description 导入UIGF数据-单项
 * @since Beta v0.4.7
 * @param {string} uid - UID
 * @param {TGApp.Plugins.UIGF.GachaItem} gacha - UIGF数据
 * @returns {string} sql
 */
export function importUIGFData(uid: string, gacha: TGApp.Plugins.UIGF.GachaItem): string {
  const sql = `
      INSERT INTO GachaRecords (uid, gachaType, itemId, count, time, name, type, rank, id, uigfType, updated)
      VALUES ('${uid}', '${gacha.gacha_type}', '${gacha.item_id ?? null}', '${gacha.count ?? null}', '${gacha.time}',
              '${gacha.name}', '${gacha.item_type ?? null}', '${gacha.rank_type ?? null}', '${gacha.id}',
              '${gacha.uigf_gacha_type}', datetime('now', 'localtime'))
      ON CONFLICT (id)
          DO UPDATE
          SET uid       = '${uid}',
              gachaType = '${gacha.gacha_type}',
              uigfType  = '${gacha.uigf_gacha_type}',
              time      = '${gacha.time}',
              itemId    = '${gacha.item_id ?? null}',
              count     = '${gacha.count ?? null}',
              name      = '${gacha.name}',
              type      = '${gacha.item_type ?? null}',
              rank      = '${gacha.rank_type ?? null}',
              updated   = datetime('now', 'localtime');
  `;
  return minifySql(sql);
}
