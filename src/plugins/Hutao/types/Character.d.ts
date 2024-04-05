/**
 * @file plugins/Hutao/types/Character.d.ts
 * @description 角色类型定义
 * @since Beta v0.4.5
 */

/**
 * @description 角色类型 namespace
 * @since Beta v0.3.8
 * @namespace TGApp.Plugins.Hutao.Character
 * @memberof TGApp.Plugins.Hutao
 */
declare namespace TGApp.Plugins.Hutao.Character {
  /**
   * @description 元数据-胡桃-技能
   * @since Beta v0.3.8
   * @memberof TGApp.Plugins.Hutao.Character
   * @description RawHutaoItem.SkillDepot.Skill => RhisdSkill
   * @property {number} GroupId 技能组编号
   * @property {string[]} Proud.Descriptions 技能描述
   * @property {RhiParameter[]} Proud.Parameters 技能参数
   * @property {number} Id 技能编号
   * @property {string} Name 技能名称
   * @property {string} Description 技能描述
   * @property {string} Icon 技能图标
   * @return RhisdSkill
   */
  interface RhisdSkill {
    GroupId: number;
    Proud: {
      Descriptions: string[];
      Parameters: RhiParameter[];
    };
    Id: number;
    Name: string;
    Description: string;
    Icon: string;
  }

  /**
   * @description 元数据-胡桃-技能-参数
   * @since Beta v0.3.8
   * @memberof TGApp.Plugins.Hutao.Character
   * @description RawHutaoItem.SkillDepot.Skill.Proud.Parameters => RhiParameter
   * @property {number} Level 技能等级
   * @property {number[]} Parameters 技能参数
   * @return RhiParameter
   */
  interface RhiParameter {
    Level: number;
    Parameters: number[];
  }

  /**
   * @description 元数据-胡桃-技能-天赋
   * @since Beta v0.3.8
   * @memberof TGApp.Plugins.Hutao.Character
   * @description RawHutaoItem.SkillDepot.Talents => RhisdTalent
   * @property {number} Id 天赋编号
   * @property {string} Name 天赋名称
   * @property {string} Description 天赋描述
   * @property {string} Icon 天赋图标
   * @return RhisdTalent
   */
  interface RhisdTalent {
    Id: number;
    Name: string;
    Description: string;
    Icon: string;
  }

  /**
   * @description 元数据-胡桃-好感信息-语音
   * @since Beta v0.3.8
   * @memberof TGApp.Plugins.Hutao.Character
   * @description RawHutaoItem.FetterInfo.Fetters => RhiFetter
   * @property {string} Title 语音标题
   * @property {string} Context 语音内容
   * @return RhiFetter
   */
  interface RhiFetter {
    Title: string;
    Context: string;
  }
}
