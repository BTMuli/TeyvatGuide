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
    birthday: Array<number>;
    /** 角色星级 */
    star: number;
    /** 角色元素类型图标 */
    element: string;
    /** 角色上线时间 */
    release: string;
    /**
     * 武器类型
     * @example 弓，法器，长柄武器，双手剑，单手剑
     */
    weapon: string;
    /** 角色名片  */
    nameCard: string;
  };

  /**
   * Wiki 页详细信息-角色技能
   * @since Beta v0.3.8
   */
  type WikiSkill = Omit<TGApp.Plugins.Hutao.Character.RhisdSkill, "Proud">;

  /**
   * 详细数据
   * @since Beta v0.9.1
   */
  type WikiItem = {
    /** 角色ID */
    id: number;
    /** 角色名称 */
    name: string;
    /** 角色称号 */
    title: string;
    /** 角色描述 */
    description: string;
    /** 角色所在地区 */
    area: string;
    /** 角色简介 */
    brief: {
      /** 角色阵营 */
      camp: string;
      /** 角色命座 */
      constellation: string;
      /** 角色生日 */
      birth: string;
      /** 角色配音 */
      cv: {
        /** 中文配音 */
        cn: string;
        /** 日语配音 */
        jp: string;
        /** 英语配音 */
        en: string;
        /** 韩语配音 */
        kr: string;
      };
    };
    /** 角色星级 */
    star: number;
    /** 角色元素 */
    element: string;
    /** 角色武器类型 */
    weapon: string;
    /** 角色养成材料 */
    materials: Array<TGApp.App.Calendar.Material>;
    /** 角色技能信息 */
    skills: Array<WikiSkill>;
    /** 角色命座信息 */
    constellation: Array<TGApp.Plugins.Hutao.Character.RhisdTalent>;
    /** 角色闲聊 */
    talks: Array<TGApp.Plugins.Hutao.Character.RhiFetter>;
    /** 角色故事 */
    stories: Array<TGApp.Plugins.Hutao.Character.RhiFetter>;
  };
}
