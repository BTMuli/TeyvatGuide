/**
 * @file plugins/Sqlite/modules/avatarBirth.ts
 * @description 角色生日模块
 * @since Beta v0.4.5
 */

import { AppCharacterData } from "../../../data";
import TGSqlite from "../index";

/**
 * @description 判断今天是不是角色生日
 * @since Beta v0.4.5
 * @param {[number,number]} date - 日期
 * @return {Promise<TGApp.Sqlite.Character.AppData[]>} 角色生日
 */
async function isAvatarBirth(date?: [number, number]): Promise<TGApp.Sqlite.Character.AppData[]> {
  let dateNow: [number, number];
  if (date) {
    dateNow = date;
  } else {
    const date = new Date();
    dateNow = [date.getMonth() + 1, date.getDate()];
  }
  const db = await TGSqlite.getDB();
  const sql = "SELECT * FROM AppCharacters WHERE birthday = ?";
  return await db.select(sql, [dateNow.join(",")]);
}

/**
 * @description 获取下一个角色生日
 * @since Beta v0.4.5
 * @param {[number,number]} date - 日期
 * @return {TGApp.Sqlite.Character.AppData[]} 下一个角色生日
 */
function getNextAvatarBirth(date?: [number, number]): TGApp.App.Character.WikiBriefInfo[] {
  const year = new Date().getFullYear();
  let month, day;
  if (date) {
    month = date[0];
    day = date[1];
  } else {
    const dateNow = new Date();
    month = dateNow.getMonth() + 1;
    day = dateNow.getDate();
  }
  const birthDateList: Date[] = [];
  for (const item of AppCharacterData) {
    if (item.birthday[0] === 0) {
      continue;
    }
    if (item.birthday[0] < month || (item.birthday[0] === month && item.birthday[1] < day)) {
      birthDateList.push(new Date(year + 1, item.birthday[0] - 1, item.birthday[1]));
    } else {
      birthDateList.push(new Date(year, item.birthday[0] - 1, item.birthday[1]));
    }
  }
  birthDateList.sort((a, b) => a.getTime() - b.getTime());
  const nextDateGet = birthDateList[0];
  const nextDate = [nextDateGet.getMonth() + 1, nextDateGet.getDate()];
  return (
    AppCharacterData.filter(
      (item) => item.birthday[0] === nextDate[0] && item.birthday[1] === nextDate[1],
    ) ?? []
  );
}

const TSAvatarBirth = {
  isAvatarBirth,
  getNextAvatarBirth,
};

export default TSAvatarBirth;
