/**
 * @file core database update.ts
 * @description SQLite 数据库更新相关
 * @since Alpha v0.1.4
 */

// tauri
import Database from "tauri-plugin-sql-api";
// local
import { TGAppData } from "../../data";
import { sqlitePath } from "./init";

/**
 * @description 数据比对-成就系列数据
 * @description 数据只有两种情况：新增、更新
 * @since Alpha v0.1.4
 * @returns {Promise<boolean>}
 */
export async function checkAchievement (): Promise<void> {
  const db = await Database.load(sqlitePath);
  await Promise.all(Object.values(TGAppData.achievements).map(async (item) => {
    // 检测是否存在
    const selectRes: BTMuli.SQLite.Achievements[] = await db.select(`SELECT * FROM Achievements WHERE id = ${item.id}`);
    if (!selectRes || selectRes.length === 0) {
      // 不存在则插入
      const sql = `INSERT INTO Achievements (id, series, \`order\`, name, description, reward, version) VALUES (${item.id}, ${item.series}, ${item.order}, '${item.name}', '${item.description}', ${item.reward}, '${item.version}')`;
      await db.execute(sql);
    } else {
      // 比对两者数据
      const selectItem = selectRes[0];
      if (selectItem.name !== item.name || selectItem.description !== item.description || selectItem.reward !== item.reward) {
        // 更新
        const sql = `UPDATE Achievements SET name = '${item.name}', description = '${item.description}', reward = ${item.reward}, version = '${item.version}' WHERE id = ${item.id}`;
        await db.execute(sql);
      }
    }
  }));
  await db.close();
}

/**
 * @description 数据比对-成就系列数据
 * @description 只有新增，更新靠触发器解决
 * @since Alpha v0.1.4
 * @returns {Promise<void>}
 */
export async function checkAchievementSeries (): Promise<void> {
  const db = await Database.load(sqlitePath);
  await Promise.all(Object.values(TGAppData.achievementSeries).map(async (item) => {
    // 检测是否存在
    const selectRes: BTMuli.SQLite.AchievementSeries[] = await db.select(`SELECT * FROM AchievementSeries WHERE id = ${item.id}`);
    if (!selectRes || selectRes.length === 0) {
      // 不存在则插入
      let sql;
      if (item.card) {
        sql = `INSERT INTO AchievementSeries (id, \`order\`, name, version, icon, nameCard) VALUES (${item.id}, ${item.order}, '${item.name}', '${item.version}', '${item.icon}', '${item.card}')`;
      } else {
        sql = `INSERT INTO AchievementSeries (id, \`order\`, name, version, icon, nameCard) VALUES (${item.id}, ${item.order}, '${item.name}', '${item.version}', '${item.icon}', NULL)`;
      }
      await db.execute(sql);
    }
  }));
  await db.close();
}
