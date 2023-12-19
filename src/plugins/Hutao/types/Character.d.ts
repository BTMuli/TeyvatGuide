/**
 * @file plugins/Hutao/types/Character.d.ts
 * @description 角色类型定义
 * @since Beta v0.3.8
 */

/**
 * @description 角色类型 namespace
 * @since Beta v0.3.8
 * @namespace TGApp.Plugins.Hutao.Character
 * @memberof TGApp.Plugins.Hutao
 */
declare namespace TGApp.Plugins.Hutao.Character {
  /**
   * @description 元数据-胡桃
   * @since Beta v0.3.8
   * @memberof TGApp.Plugins.Hutao.Character
   * @description RawHutaoItem => Rhi
   * @property {number} Id 角色编号
   * @property {number} PromoteId 未知
   * @property {number} Sort 排序
   * @property {number} Body 未知
   * @property {string} Icon 角色头像
   * @property {string} SideIcon 角色侧面头像
   * @property {string} Name 角色名称
   * @property {string} Description 角色简介
   * @property {string} BeginTime 上线时间 // 2021-03-02T16:00:00+08:00
   * @property {number} Quality 角色星级
   * @property {TGApp.Plugins.Hutao.Base.WeaponType} Weapon 武器类型
   * @property {RhiBaseValue} BaseValue 角色基础属性
   * @property {RhiGrowCurve[]} GrowCurves 未知
   * @property {RhiSkillDepot} SkillDepot 角色技能
   * @property {RhiFetterInfo} FetterInfo 好感信息
   * @property {RhiCostume[]} Costumes 角色皮肤
   * @property {number[]} CultivationItems 角色培养材料
   * @return RawHutaoItem
   */
  interface RawHutaoItem {
    Id: number;
    PromoteId: number;
    Sort: number;
    Body: number;
    Icon: string;
    SideIcon: string;
    Name: string;
    Description: string;
    BeginTime: string;
    Quality: number;
    Weapon: TGApp.Plugins.Hutao.Base.WeaponType;
    BaseValue: RhiBaseValue;
    GrowCurves: RhiGrowCurve[];
    SkillDepot: RhiSkillDepot;
    FetterInfo: RhiFetterInfo;
    Costumes: RhiCostume[];
    CultivationItems: number[];
  }

  /**
   * @description 元数据-胡桃-基础属性
   * @since Beta v0.3.8
   * @memberof TGApp.Plugins.Hutao.Character
   * @description RawHutaoItem.BaseValue => Rhi.BaseValue
   * @property {number} HpBase 生命值
   * @property {number} AttackBase 攻击力
   * @property {number} DefenseBase 防御力
   * @return RhiBaseValue
   */
  interface RhiBaseValue {
    HpBase: number;
    AttackBase: number;
    DefenseBase: number;
  }

  /**
   * @description 元数据-胡桃-成长曲线
   * @since Beta v0.3.8
   * @memberof TGApp.Plugins.Hutao.Character
   * @description RawHutaoItem.GrowCurves => Rhi.GrowCurves
   * @property {number} Type 未知
   * @property {number} Value 未知
   * @return RhiGrowCurve
   */
  interface RhiGrowCurve {
    Type: number;
    Value: number;
  }

  /**
   * @description 元数据-胡桃-技能
   * @since Beta v0.3.8
   * @memberof TGApp.Plugins.Hutao.Character
   * @description RawHutaoItem.SkillDepot => Rhi.SkillDepot
   * @property {number} Arkhe 未知
   * @property {RhisdSkill[]} Skills 角色技能
   * @property {RhisdSkill} EnergySkill 角色元素爆发
   * @property {RhisdSkill[]} Inherents 角色天赋
   * @property {RhisdTalent[]} Talents 角色天赋
   * @return RhiSkillDepot
   */
  interface RhiSkillDepot {
    Arkhe: number;
    Skills: RhisdSkill[];
    EnergySkill: RhisdSkill;
    Inherents: RhisdSkill[];
    Talents: RhisdTalent[];
  }

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
   * @description 元数据-胡桃-好感信息
   * @since Beta v0.3.8
   * @memberof TGApp.Plugins.Hutao.Character
   * @description RawHutaoItem.FetterInfo => RhiFetterInfo
   * @property {string} Title 角色称号
   * @property {string} Detail 角色简介
   * @property {number} Association 角色地区
   * @property {string} Native 角色地区
   * @property {number} BirthMonth 角色生日-月
   * @property {number} BirthDay 角色生日-日
   * @property {string} VisionBefore 角色元素类型
   * @property {string} VisionAfter 未知
   * @property {string} ConstellationBefore 角色星座
   * @property {string} ConstellationAfter 未知
   * @property {string} CvChinese 角色声优-中文
   * @property {string} CvJapanese 角色声优-日文
   * @property {string} CvEnglish 角色声优-英文
   * @property {string} CvKorean 角色声优-韩文
   * @property {number} CookBonus.OriginItemId 角色特殊料理编号
   * @property {number} CookBonus.ItemId 角色特殊料理编号
   * @property {number[]} CookBonus.InputList 角色特殊料理材料
   * @property {RhiFetter[]} Fetters 角色语音
   * @property {RhiFetter[]} FetterStories 角色好感故事
   * @return RhiFetterInfo
   */
  interface RhiFetterInfo {
    Title: string;
    Detail: string;
    Association: number;
    Native: string;
    BirthMonth: number;
    BirthDay: number;
    VisionBefore: string;
    VisionAfter: string;
    ConstellationBefore: string;
    ConstellationAfter: string;
    CvChinese: string;
    CvJapanese: string;
    CvEnglish: string;
    CvKorean: string;
    CookBonus: {
      OriginItemId: number;
      ItemId: number;
      InputList: number[];
    };
    Fetters: RhiFetter[];
    FetterStories: RhiFetter[];
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

  /**
   * @description 元数据-胡桃-皮肤
   * @since Beta v0.3.8
   * @memberof TGApp.Plugins.Hutao.Character
   * @description RawHutaoItem.Costumes => RhiCostume
   * @property {number} Id 皮肤编号
   * @property {string} Name 皮肤名称
   * @property {string} Description 皮肤描述
   * @property {boolean} IsDefault 是否默认皮肤
   * @property {string} [FrontIcon] 非默认皮肤头像
   * @property {string} [SideIcon] 非默认皮肤侧面头像
   * @return RhiCostume
   */
  type RhiCostume = {
    Id: number;
    Name: string;
    Description: string;
  } & (
    | {
        FrontIcon: string;
        SideIcon: string;
        IsDefault: false;
      }
    | {
        IsDefault: true;
      }
  );
}
