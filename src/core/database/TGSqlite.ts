/**
 * @file core database TGSqlite.ts
 * @description SQLite 数据库相关
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.4
 */

import { initDatabase, resetDatabase, checkDatabase, sqlitePath } from "./init";
import { getAllSeries, getAchievementsBySeries, searchAchievement, getAchievementOverview } from "./select";
import { importUIAFData, exportUIAFData } from "./UIAF";
import { checkAchievement, checkAchievementSeries } from "./update";

const TGSqlite = {
  initDB: initDatabase,
  resetDB: resetDatabase,
  checkDB: checkDatabase,
  search: {
    achievement: {
      bySeries: getAchievementsBySeries,
      bySearch: searchAchievement,
    },
    achievementSeries: getAllSeries,
    overview: getAchievementOverview,
  },
  UIAF: {
    import: importUIAFData,
    export: exportUIAFData,
  },
  update: {
    achievement: checkAchievement,
    achievementSeries: checkAchievementSeries,
  },
  dbPath: sqlitePath,
};

export default TGSqlite;
