/**
 * 游戏安装数据库模块。
 * @since Beta v0.11.5
 */

import TGSqlite from "../index.js";

/**
 * 保存检测结果并设为当前安装。
 * @since Beta v0.11.5
 * @param installation - 后端检测确认的安装
 */
async function save(installation: TGApp.Game.Installation.Item): Promise<void> {
  const preferredScheme = installation.schemeId ?? installation.preferredScheme ?? null;
  await TGSqlite.executeTransaction([
    { query: "UPDATE GameInstallation SET isChosen = 0 WHERE isChosen <> 0;" },
    {
      query: `INSERT INTO GameInstallation(
                id, executablePath, rootPath, preferredScheme,
                audioLanguages, isChosen, lastSeen
              ) VALUES ($1, $2, $3, $4, $5, 1, $6)
              ON CONFLICT(id) DO UPDATE SET
                executablePath = $2,
                rootPath = $3,
                preferredScheme = $4,
                audioLanguages = $5,
                isChosen = 1,
                lastSeen = $6;`,
      values: [
        installation.id,
        installation.executablePath,
        installation.rootPath,
        preferredScheme,
        JSON.stringify(installation.audioLanguages),
        installation.lastSeen,
      ],
    },
  ]);
}

/**
 * 将指定本地安装设为主启动路径（唯一 isChosen）。
 * @since Beta v0.11.5
 * @param id - 安装记录 id
 */
async function choose(id: string): Promise<void> {
  await TGSqlite.executeTransaction([
    { query: "UPDATE GameInstallation SET isChosen = 0 WHERE isChosen <> 0;" },
    { query: "UPDATE GameInstallation SET isChosen = 1 WHERE id = $1;", values: [id] },
  ]);
}

const TSGameInstallation = { save, choose };

export default TSGameInstallation;
