/**
 * @file src/enum/anno.ts
 * @description 游戏内公告相关枚举
 * @since Beta v0.8.0
 */

/**
 * @description 公告语言类型
 * @since Beta v0.7.7
 * @const AnnoLangEnum
 */
export const AnnoLangEnum: typeof TGApp.BBS.Announcement.AnnoLang = {
  CHS: "zh-cn",
  CHT: "zh-tw",
  EN: "en",
  JP: "ja",
};

/**
 * @description 获取公告语音描述
 * @since Beta v0.7.7
 * @param {TGApp.BBS.Announcement.AnnoLangEnum} lang 公告语言
 * @return {string} 公告语言描述
 */
export function getAnnoLangDesc(lang: TGApp.BBS.Announcement.AnnoLangEnum): string {
  switch (lang) {
    case AnnoLangEnum.CHS:
      return "简体中文";
    case AnnoLangEnum.CHT:
      return "繁体中文";
    case AnnoLangEnum.EN:
      return "英语";
    case AnnoLangEnum.JP:
      return "日语";
  }
}

/**
 * @description 公告类型
 * @since Beta v0.7.7
 * @const AnnoTypeEnum
 */
export const AnnoTypeEnum: typeof TGApp.BBS.Announcement.AnnoType = {
  ACTIVITY: "activity",
  GAME: "game",
};

/**
 * @description 获取公告类型描述
 * @since Beta v0.7.7
 * @param {TGApp.BBS.Announcement.AnnoTypeEnum} type 公告类型
 * @return {string} 公告类型描述
 */
export function getAnnoTypeDesc(type: TGApp.BBS.Announcement.AnnoTypeEnum): string {
  switch (type) {
    case AnnoTypeEnum.ACTIVITY:
      return "活动公告";
    case AnnoTypeEnum.GAME:
      return "游戏公告";
  }
}
