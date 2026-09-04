/**
 * 游戏安装数据库模块。
 * @since Beta v0.12.2
 */

import TGLogger from "@utils/TGLogger.js";

import TGSqlite from "../index.js";

async function writeRegistrationLog(message: string): Promise<void> {
  try {
    await TGLogger.Info(message);
  } catch (error) {
    console.error(`[GameInstall][logger] 写入安装登记日志失败：${error}`);
  }
}

async function writeRegistrationError(message: string): Promise<void> {
  try {
    await TGLogger.Error(message);
  } catch (error) {
    console.error(`[GameInstall][logger] 写入安装登记错误日志失败：${error}`);
  }
}

/**
 * 保存检测结果并设为当前安装。
 * @since Beta v0.12.2
 * @param installation - 后端检测确认的安装
 */
async function save(installation: TGApp.Game.Installation.Item): Promise<void> {
  const startedAt = Date.now();
  const preferredScheme = installation.schemeId ?? installation.preferredScheme ?? null;
  const context = `context=${JSON.stringify({
    installationId: installation.id,
    scheme: preferredScheme,
    status: installation.status,
  })}`;
  await writeRegistrationLog(`[GameInstall][registration_save] 开始 ${context}`);
  try {
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
    await writeRegistrationLog(
      `[GameInstall][registration_save] 成功 durationMs=${Date.now() - startedAt} ${context}`,
    );
  } catch (error) {
    await writeRegistrationError(
      `[GameInstall][registration_save] 失败 durationMs=${Date.now() - startedAt} ${context} error=${error}`,
    );
    throw error;
  }
}

const TSGameInstallation = { save };

export default TSGameInstallation;
