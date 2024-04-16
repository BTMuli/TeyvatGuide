/**
 * @file plugins/Sqlite/modules/avatarBirth.ts
 * @description 角色生日模块
 * @since Beta v0.4.6
 */

import { AppCharacterData, ArcBirCalendar, ArcBirRole } from "../../../data";

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
    return find.map((i) => {
      i.is_subscribe = true;
      return i;
    });
  }
  const find2 = AppCharacterData.filter((i) => i.birthday.toString() === [month, day].toString());
  return find2.map((i) => {
    return <TGApp.Archive.Birth.CalendarItem>{
      role_id: i.id,
      name: i.name,
      role_birthday: `${month}/${day}`,
      head_icon: `/WIKI/character/${i.id}.webp`,
      is_subscribe: false,
    };
  });
}

/**
 * @description 获取角色生日
 * @since Beta v0.4.6
 * @param {string} roleBirthday - 角色生日
 * @return {[number,number]} 角色生日
 */
function getRoleBirth(roleBirthday: string): [number, number] {
  const arr: string[] = roleBirthday.split("/");
  return [Number(arr[0]), Number(arr[1])];
}

/**
 * @description 获取下一个角色生日
 * @since Beta v0.4.5
 * @param {[number,number]} date - 日期
 * @return {TGApp.Archive.Birth.RoleItem[]} 下一个角色生日
 */
function getNextAvatarBirth(date?: [number, number]): TGApp.Archive.Birth.RoleItem[] {
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
  for (const item of ArcBirRole) {
    const roleBirth = getRoleBirth(item.role_birthday);
    if (roleBirth[0] < month || (roleBirth[0] === month && roleBirth[1] <= day)) {
      birthDateList.push(new Date(year + 1, roleBirth[0] - 1, roleBirth[1]));
    } else {
      birthDateList.push(new Date(year, roleBirth[0] - 1, roleBirth[1]));
    }
  }
  birthDateList.sort((a, b) => a.getTime() - b.getTime());
  const nextDateGet = birthDateList[0];
  const nextDate = [nextDateGet.getMonth() + 1, nextDateGet.getDate()];
  return ArcBirRole.filter((i) => i.role_birthday === `${nextDate[0]}/${nextDate[1]}`);
}

const TSAvatarBirth = {
  isAvatarBirth,
  getNextAvatarBirth,
};

export default TSAvatarBirth;
