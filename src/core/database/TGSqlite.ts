/**
 * @file core database TGSqlite.ts
 * @description SQLite 数据库相关
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.4
 */

import { initDatabase, resetDatabase, checkDatabase, sqlitePath } from "./init";
import { checkAchievement, checkAchievementSeries } from "./update";

const TGSqlite = {
  initDB: initDatabase,
  resetDB: resetDatabase,
  checkDB: checkDatabase,
  update: {
    achievement: checkAchievement,
    achievementSeries: checkAchievementSeries,
  },
  dbPath: sqlitePath,
};

export default TGSqlite;
