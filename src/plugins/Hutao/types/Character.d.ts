/**
 * 角色类型定义
 * @since Beta v0.4.5
 */

declare namespace TGApp.Plugins.Hutao.Character {
  /**
   * 元数据 - 胡桃 - 技能
   * @since Beta v0.3.8
   * @remarks RawHutaoItem.SkillDepot.Skill
   */
  type RhisdSkill = {
    /** 技能组编号 */
    GroupId: number;
    /** 技能描述与参数 */
    Proud: {
      /** 技能描述 */
      Descriptions: Array<string>;
      /** 技能参数 */
      Parameters: Array<RhiParameter>;
    };
    /** 技能编号 */
    Id: number;
    /** 技能名称 */
    Name: string;
    /** 技能描述 */
    Description: string;
    /** 技能图标 */
    Icon: string;
  };

  /**
   * 元数据 - 胡桃 - 技能参数
   * @since Beta v0.3.8
   * @remarks RawHutaoItem.SkillDepot.Skill.Proud.Parameters
   */
  type RhiParameter = {
    /** 技能等级 */
    Level: number;
    /** 技能参数 */
    Parameters: Array<number>;
  };

  /**
   * 元数据 - 胡桃 - 技能天赋
   * @since Beta v0.3.8
   * @remarks RawHutaoItem.SkillDepot.Talents
   */
  type RhisdTalent = {
    /** 天赋编号 */
    Id: number;
    /** 天赋名称 */
    Name: string;
    /** 天赋描述 */
    Description: string;
    /** 天赋图标 */
    Icon: string;
  };

  /**
   * 元数据 - 胡桃 - 好感信息 - 语音
   * @since Beta v0.3.8
   * @remarks RawHutaoItem.FetterInfo.Fetters
   */
  type RhiFetter = {
    /** 语音标题 */
    Title: string;
    /** 语音内容 */
    Context: string;
  };
}
