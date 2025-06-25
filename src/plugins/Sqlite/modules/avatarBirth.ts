/**
 * @file plugins/Sqlite/modules/avatarBirth.ts
 * @description 角色生日模块
 * @since Beta v0.8.0
 */

import {
  AppCharacterData,
  ArcBirCalendar,
  ArcBirRole,
  getWikiCharacterById,
} from "@/data/index.js";

/**
 * @description 判断今天是不是角色生日
 * @since Beta v0.4.6
 * @return {TGApp.Archive.Birth.CalendarItem[]} 角色生日
 */
function isAvatarBirth(): TGApp.Archive.Birth.CalendarItem[] {
  const date = new Date();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const days = ArcBirCalendar[month];
  const find = days.filter((i) => i.role_birthday === `${month}/${day}`);
  if (find.length > 0) {
    for (const i of find) i.is_subscribe = true;
    return find;
  }
  const find2 = AppCharacterData.filter((i) => i.birthday.toString() === [month, day].toString());
  return find2.map((i) => ({
    role_id: i.id,
    name: i.name,
    role_birthday: `${month}/${day}`,
    head_icon: `/WIKI/character/${i.id}.webp`,
    is_subscribe: false,
  }));
}

/**
 * @description 校验是否是闰年
 * @since Beta v0.4.6
 * @param {number} year - 年份
 * @return {boolean} 是否是闰年
 */
function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * @description 获取下一个角色生日
 * @since Beta v0.7.0
 * @param {[number,number]} date - 日期
 * @return {TGApp.Archive.Birth.RoleItem[]} 下一个角色生日
 */
async function getNextAvatarBirth(
  date?: [number, number],
): Promise<Array<TGApp.Archive.Birth.RoleItem>> {
  let month, day;
  if (date) {
    month = date[0];
    day = date[1];
  } else {
    month = new Date().getMonth() + 1;
    day = new Date().getDate();
  }
  const sortList = AppCharacterData.sort((a, b) => {
    if (a.birthday[0] === b.birthday[0]) return a.birthday[1] - b.birthday[1];
    return a.birthday[0] - b.birthday[0];
  });
  let filterList = sortList.filter((i) => {
    if (i.birthday[0] > month) return true;
    return i.birthday[0] === month && i.birthday[1] > day;
  });
  if (filterList.length === 0) filterList = sortList;
  let birthGet = filterList[0];
  if (birthGet.id === 10000032 && !isLeapYear(new Date().getFullYear())) {
    birthGet = filterList[1];
  }
  const dataGet = AppCharacterData.filter(
    (i) => i.birthday.toString() === birthGet.birthday.toString(),
  );
  const res: TGApp.Archive.Birth.RoleItem[] = [];
  for (const i of dataGet) {
    const find = ArcBirRole.find((j) => j.role_id === i.id);
    if (find) {
      res.push(find);
      continue;
    }
    const find2 = await getWikiCharacterById(i.id);
    if (!find2) continue;
    // 只写了用到的字段
    res.push({
      belong: find2.brief.camp,
      current_compensate_num: 0,
      divine_type: "",
      element: find2.element,
      head_image: `/WIKI/character/${i.id}.webp`,
      introduce: find2.description,
      is_compensate_num: false,
      is_finish_task: false,
      is_god: false,
      seat_life: "",
      text: "",
      year_compensate_num: 0,
      role_id: i.id,
      name: i.name,
      role_birthday: `${i.birthday[0]}/${i.birthday[1]}`,
      head_icon: `/WIKI/character/${i.id}.webp`,
      is_subscribe: false,
    });
  }
  return res;
}

const TSAvatarBirth = { isAvatarBirth, getNextAvatarBirth };

export default TSAvatarBirth;
