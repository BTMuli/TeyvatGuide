/**
 * 角色相关类型定义文件
 * @since Beta v0.9.0
 */

declare namespace TGApp.App.Character {
  /**
   * Wiki 页简略信息
   * @since Beta v0.9.0
   */
  type WikiBriefInfo = {
    /** 角色 ID */
    id: number;
    /** 观测枢的 content_id */
    contentId: number;
    /** 角色名称 */
    name: string;
    /** 角色称号 */
    title: string;
    /** 角色地区 */
    area: string;
    /** 角色生日 [月, 日] */
    birthday: number[];
    /** 角色星级 */
    star: number;
    /** 角色元素类型图标 */
    element: string;
    /** 角色上线时间 */
    release: string;
    /** 角色武器类型图标 */
    weapon: string;
    /** 角色名片  */
    nameCard: string;
  };

  /**
   * @description Wiki 页详细信息-角色技能
   * @since Beta v0.3.8
   * @interface WikiSkill
   * @memberof TGApp.App.Character
   * @return WikiSkill
   */
  type WikiSkill = Omit<TGApp.Plugins.Hutao.Character.RhisdSkill, "Proud">;

  /**
   * @description Wiki 详细数据
   * @since Beta v0.4.2
   * @interface WikiItem
   * @memberof TGApp.Plugins.Hutao.Character
   * @property {number} id 角色编号
   * @property {string} name 角色名称
   * @property {string} title 角色称号
   * @property {string} description 角色简介
   * @property {string} area 角色地区 // 蒙德、璃月、稻妻、须弥、枫丹、愚人众、其他
   * @property {object} brief 角色简介
   * @property {string} brief.camp 角色地区
   * @property {string} brief.constellation 角色星座
   * @property {string} brief.birth 角色生日
   * @property {object} brief.cv 角色声优
   * @property {string} brief.cv.cn 角色声优-中文
   * @property {string} brief.cv.jp 角色声优-日文
   * @property {string} brief.cv.en 角色声优-英文
   * @property {string} brief.cv.kr 角色声优-韩文
   * @property {number} star 角色星级
   * @property {string} element 角色元素类型
   * @property {TGApp.Plugins.Hutao.Base.WeaponType} weapon 角色武器类型
   * @property {TGApp.App.Calendar.Material[]} materials 角色培养材料
   * @property {TGApp.Plugins.Hutao.Character.RhisdSkill[]} skills 角色技能
   * @property {TGApp.Plugins.Hutao.Character.RhisdTalent[]} constellation 角色命座
   * @property {TGApp.Plugins.Hutao.Character.RhiFetter[]} talks 闲聊
   * @property {TGApp.Plugins.Hutao.Character.RhiFetter[]} stories 故事
   * @return WikiItem
   */
  type WikiItem = {
    id: number;
    name: string;
    title: string;
    description: string;
    area: string;
    brief: {
      camp: string;
      constellation: string;
      birth: string;
      cv: { cn: string; jp: string; en: string; kr: string };
    };
    star: number;
    element: string;
    weapon: string;
    materials: TGApp.App.Calendar.Material[];
    skills: WikiSkill[];
    constellation: TGApp.Plugins.Hutao.Character.RhisdTalent[];
    talks: TGApp.Plugins.Hutao.Character.RhiFetter[];
    stories: TGApp.Plugins.Hutao.Character.RhiFetter[];
  };
}
