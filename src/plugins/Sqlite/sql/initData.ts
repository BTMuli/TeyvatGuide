/**
 * SQLite 应用数据初始化
 * @since Beta v0.13.2
 */

import { app } from "@tauri-apps/api";
import type Database from "@tauri-apps/plugin-sql";

/**
 * 在同一条语句中写入更新标记，并补齐默认 Cookie 记录。
 * @since Beta v0.13.2
 * @param db - 数据库连接
 * @param buildTime - 应用构建时间
 */
async function initAppData(db: Database, buildTime?: string): Promise<void> {
  const appVersion = await app.getVersion();
  const dataUpdated: string = buildTime ?? import.meta.env.VITE_BUILD_TIME ?? "";
  await db.execute(
    `INSERT INTO AppData (key, value, updated)
     VALUES ('appVersion', $1, datetime('now', 'localtime')),
            ('dataUpdated', $2, datetime('now', 'localtime')),
            ('cookie', '{}', datetime('now', 'localtime'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated = excluded.updated
     WHERE excluded.key IN ('appVersion', 'dataUpdated');`,
    [appVersion, dataUpdated],
  );
}

export default initAppData;
