/**
 * @file plugins Sqlite sql insertData.ts
 * @description Sqlite 插入数据 sql 语句
 * @author BTMuli <bt-muli@outlook.com>
 * @since Alpha v0.2.0
 */

/**
 * @description 插入成就数据
 * @since Alpha v0.2.0
 * @param {TGApp.App.Achievement.Item} data 成就数据
 * @returns {string} sql
 */
export function insertAchievementData (data: TGApp.App.Achievement.Item): string {
  return `
      INSERT INTO Achievements (id, series, "order", name, description, reward, completedTime, version, updated)
      VALUES (${data.id}, ${data.series}, ${data.order}, '${data.name}', '${data.description}', ${data.reward}, '',
              '${data.version}', datetime('now', 'localtime'))
      ON CONFLICT(id) DO UPDATE
          SET series      = ${data.series},
              "order"     = ${data.order},
              name        = '${data.name}',
              description = '${data.description}',
              reward      = '${data.reward}',
              version     = '${data.version}',
              updated     = datetime('now', 'localtime');
  `;
}

/**
 * @description 插入成就系列数据
 * @since Alpha v0.2.0
 * @param {TGApp.App.Achievement.Series} data 成就系列数据
 * @returns {string} sql
 */
export function insertAchievementSeriesData (data: TGApp.App.Achievement.Series): string {
  return `
      INSERT INTO AchievementSeries (id, "order", name, version, nameCard, updated)
      VALUES (${data.id}, ${data.order}, '${data.name}', '${data.version}','${data.card}', datetime('now', 'localtime'))
      ON CONFLICT(id) DO UPDATE
          SET name        = '${data.name}',
              "order"     = ${data.order},
              version     = '${data.version}',
              nameCard    = '${data.card}',
              updated     = datetime('now', 'localtime');
  `;
}

/**
 * @description 插入应用数据
 * @since Alpha v0.2.0
 * @param {string} key 键
 * @param {string} value 值
 * @returns {string} sql
 */
export function insertAppData (key: string, value: string): string {
  return `
      INSERT INTO AppData (key, value, updated)
      VALUES ('${key}', '${value}', datetime('now', 'localtime'))
      ON CONFLICT(key) DO UPDATE SET value = '${value}', updated = datetime('now', 'localtime');
  `;
}

/**
 * @description 插入游戏账号数据
 * @since Alpha v0.2.0
 * @param {TGApp.User.Account.Game} data 游戏账号数据
 * @returns {string} sql
 */
export function insertGameAccountData (data: TGApp.User.Account.Game): string {
  const isChosen = data.is_chosen ? 1 : 0;
  const isOfficial = data.is_official ? 1 : 0;
  return `
      INSERT INTO GameAccount (gameBiz, gameUid, isChosen, isOfficial, level, nickname, region, regionName, updated)
      VALUES ('${data.game_biz}', '${data.game_uid}', ${isChosen}, ${isOfficial}, ${data.level}, '${data.nickname}',
              '${data.region}', '${data.region_name}', datetime('now', 'localtime'))
      ON CONFLICT(gameBiz, gameUid) DO UPDATE
          SET isChosen   = ${isChosen},
              isOfficial = ${isOfficial},
              level      = ${data.level},
              nickname   = '${data.nickname}',
              region     = '${data.region}',
              regionName = '${data.region_name}',
              updated    = datetime('now', 'localtime');
  `;
}

/**
 * @description 插入名片数据
 * @since Alpha v0.2.0
 * @param {TGApp.App.NameCard.Item} data 名片数据
 * @returns {string} sql
 */
export function insertNameCardData (data: TGApp.App.NameCard.Item): string {
  return `
      INSERT INTO NameCard (name, "desc", type, source, updated)
      VALUES ('${data.name}', '${data.desc}', '${data.type}', '${data.source}', datetime('now', 'localtime'))
      ON CONFLICT(name, type) DO UPDATE
          SET "desc"  = '${data.desc}',
              source  = '${data.source}',
              updated = datetime('now', 'localtime');
  `;
}
