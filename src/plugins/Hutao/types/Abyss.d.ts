/**
 * @file src/plugins/Hutao/types/Abyss.d.ts
 * @description Hutao 插件深渊类型定义文件
 * @since Beta v0.3.0
 */

/**
 * @description Hutao 深渊类型定义
 * @since Alpha v0.2.1
 * @namespace Abyss
 * @return Abyss
 */
declare namespace TGApp.Plugins.Hutao.Abyss {
  /**
   * @description 深渊记录上传数据
   * @since Alpha v0.2.1
   * @see HutaoRequest.Abyss.postData
   * @interface RecordUpload
   * @property {string} Uid - UID
   * @property {string} Identity - 身份标识
   * @property {RecordData} SpiralAbyss - 深渊记录
   * @property {Avatar[]} Avatars - 角色信息
   * @property {string} ReservedUserName - 保留用户名
   * @return RecordUpload
   */
  interface RecordUpload {
    Uid: string;
    Identity: string;
    SpiralAbyss: RecordData;
    Avatars: Avatar[];
    ReservedUserName: string;
  }

  /**
   * @description 深渊记录
   * @since Alpha v0.2.2
   * @interface RecordData
   * @property {number} ScheduleId - 深渊期数
   * @property {number} TotalBattleTimes - 总战斗次数
   * @property {number} TotalWinTimes - 总胜利次数
   * @property {number} Damage.AvatarId - 最大伤害角色ID
   * @property {number} Damage.Value - 最大伤害
   * @property {number} Defeat.AvatarId - 最多击败数角色ID
   * @property {number} Defeat.Value - 最多击败数
   * @property {number} EnergySkill.AvatarId - 最多元素爆发释放数角色ID
   * @property {number} EnergySkill.Value - 最多元素爆发释放数
   * @property {number} NormalSkill.AvatarId - 最多元素战技释放数角色ID
   * @property {number} NormalSkill.Value - 最多元素战技释放数
   * @property {number} TakeDamage.AvatarId - 最大承伤角色ID
   * @property {number} TakeDamage.Value - 最大承伤
   * @property {Floor[]} Floors - 楼层信息
   * @return RecordData
   */
  interface RecordData {
    ScheduleId: number;
    TotalBattleTimes: number;
    TotalWinTimes: number;
    Defeat: {
      AvatarId: number;
      Value: number;
    };
    EnergySkill: {
      AvatarId: number;
      Value: number;
    };
    NormalSkill: {
      AvatarId: number;
      Value: number;
    };
    Damage: {
      AvatarId: number;
      Value: number;
    };
    TakeDamage: {
      AvatarId: number;
      Value: number;
    };
    Floors: Floor[];
  }

  /**
   * @description 深渊楼层信息
   * @since Alpha v0.2.1
   * @interface Floor
   * @property {number} Index - 楼层索引
   * @property {number} Star - 楼层星数
   * @property {Level[]} Levels - 楼层关卡信息
   * @return Floor
   */
  interface Floor {
    Index: number;
    Star: number;
    Levels: Level[];
  }

  /**
   * @description 深渊房间信息
   * @since Alpha v0.2.1
   * @interface Level
   * @property {number} Index - 关卡索引
   * @property {number} Star - 关卡星数
   * @property {number} Battles[].Index - 战斗索引
   * @property {number[]} Battles[].Avatars - 战斗角色ID
   * @return Level
   */
  interface Level {
    Index: number;
    Star: number;
    Battles: Array<{
      Index: number;
      Avatars: number[];
    }>;
  }

  /**
   * @description 角色信息
   * @since Alpha v0.2.1
   * @interface Avatar
   * @property {number} AvatarId - 角色ID
   * @property {number} WeaponId - 武器ID
   * @property {number[]} ReliquarySetIds - 圣遗物套装ID
   * @property {number} ActivedConstellationNumber - 已激活命座数量
   * @return Avatar
   */
  interface Avatar {
    AvatarId: number;
    WeaponId: number;
    ReliquarySetIds: number[];
    ActivedConstellationNumber: number;
  }

  /**
   * @description 深渊记录上传返回
   * @since Alpha v0.2.1
   * @see HutaoRequest.Abyss.postData
   * @interface UploadResponse
   * @extends TGApp.Plugins.Hutao.Base.Response
   * @return UploadResponse
   */
  type UploadResponse = TGApp.Plugins.Hutao.Base.Response;

  /**
   * @description 获取深渊总览数据返回
   * @since Alpha v0.2.1
   * @see HutaoRequest.Abyss.getOverview
   * @interface OverviewResponse
   * @extends TGApp.Plugins.Hutao.Base.Response
   * @property {OverviewData} data - 深渊总览数据
   * @return OverviewResponse
   */
  interface OverviewResponse extends TGApp.Plugins.Hutao.Base.Response {
    data: OverviewData;
  }

  /**
   * @description 深渊总览数据
   * @since Alpha v0.2.1
   * @interface OverviewData
   * @property {number} ScheduleId - 深渊期数
   * @property {number} RecordTotal - 总记录数
   * @property {number} SpiralAbyssTotal - 总计深渊记录
   * @property {number} SpiralAbyssFullStar - 满星深渊记录数
   * @property {number} SpiralAbyssPassed - 通关深渊记录数
   * @property {number} SpiralAbyssStarTotal - 总星数
   * @property {number} SpiralAbyssBattleTotal - 总战斗次数
   * @property {number} Timestamp - 时间戳
   * @property {number} TimeTotal - 总耗时
   * @property {number} TimeAverage - 平均耗时
   * @return OverviewData
   */
  interface OverviewData {
    ScheduleId: number;
    RecordTotal: number;
    SpiralAbyssTotal: number;
    SpiralAbyssFullStar: number;
    SpiralAbyssPassed: number;
    SpiralAbyssStarTotal: number;
    SpiralAbyssBattleTotal: number;
    Timestamp: number;
    TimeTotal: number;
    TimeAverage: number;
  }

  /**
   * @description 获取角色深渊上场率返回
   * @since Alpha v0.2.1
   * @see HutaoRequest.Abyss.avatar.getUpRate
   * @interface AvatarUpResponse
   * @extends TGApp.Plugins.Hutao.Base.Response
   * @property {AvatarUp[]} data - 角色深渊上场率
   * @return AvatarUpResponse
   */
  interface AvatarUpResponse extends TGApp.Plugins.Hutao.Base.Response {
    data: AvatarUp[];
  }

  /**
   * @description 角色深渊上场率
   * @since Alpha v0.2.1
   * @interface AvatarUp
   * @property {number} Floor - 楼层
   * @property {Array<TGApp.Plugins.Hutao.Base.Rate>} Ranks - 角色上场率
   * @return AvatarUp
   */
  interface AvatarUp {
    Floor: number;
    Ranks: Array<TGApp.Plugins.Hutao.Base.Rate>;
  }

  /**
   * @description 获取角色深渊使用率返回
   * @since Alpha v0.2.1
   * @see HutaoRequest.Abyss.avatar.getUseRate
   * @interface AvatarUseResponse
   * @extends TGApp.Plugins.Hutao.Base.Response
   * @property {AvatarUse[]} data - 角色深渊使用率
   * @return AvatarUseResponse
   */
  interface AvatarUseResponse extends TGApp.Plugins.Hutao.Base.Response {
    data: AvatarUse[];
  }

  /**
   * @description 角色深渊使用率
   * @since Alpha v0.2.1
   * @interface AvatarUse
   * @property {number} Floor - 楼层
   * @property {Array<TGApp.Plugins.Hutao.Base.Rate>} Ranks 角色使用率
   * @return AvatarUse
   */
  interface AvatarUse {
    Floor: number;
    Ranks: Array<TGApp.Plugins.Hutao.Base.Rate>;
  }

  /**
   * @description 获取角色深渊持有率返回
   * @since Alpha v0.2.1
   * @see HutaoRequest.Abyss.avatar.getHoldRate
   * @interface AvatarHoldResponse
   * @extends TGApp.Plugins.Hutao.Base.Response
   * @property {AvatarHold[]} data - 角色深渊持有率
   * @return AvatarHoldResponse
   */
  interface AvatarHoldResponse extends TGApp.Plugins.Hutao.Base.Response {
    data: AvatarHold[];
  }

  /**
   * @description 角色深渊持有率
   * @since Alpha v0.2.1
   * @interface AvatarHold
   * @property {number} HoldingRate - 持有率
   * @property {Array<TGApp.Plugins.Hutao.Base.Rate>} Constellations - 持有率
   * @property {number} AvatarId - 角色ID
   * @return AvatarHold
   */
  interface AvatarHold {
    HoldingRate: number;
    Constellations: Array<TGApp.Plugins.Hutao.Base.Rate>;
    AvatarId: number;
  }

  /**
   * @description 获取角色的圣遗物、武器搭配
   * @since Alpha v0.2.1
   * @see HutaoRequest.Abyss.avatar.getCollect
   * @interface AvatarCollocationResponse
   * @extends TGApp.Plugins.Hutao.Base.Response
   * @property {AvatarCollocation[]} data - 角色搭配
   * @return AvatarCollocationResponse
   */
  interface AvatarCollocationResponse extends TGApp.Plugins.Hutao.Base.Response {
    data: AvatarCollocation[];
  }

  /**
   * @description 角色搭配
   * @since Alpha v0.2.1
   * @interface AvatarCollocation
   * @property {number} AvatarId - 角色ID
   * @property {Array<TGApp.Plugins.Hutao.Base.Rate>} Avatars - 角色搭配率
   * @property {Array<TGApp.Plugins.Hutao.Base.Rate<string>>} Reliquaries - 圣遗物套装搭配率
   * @property {Array<TGApp.Plugins.Hutao.Base.Rate>} Weapons - 武器搭配率
   * @return AvatarCollocation
   */
  interface AvatarCollocation {
    AvatarId: number;
    Avatars: Array<TGApp.Plugins.Hutao.Base.Rate>;
    Reliquaries: Array<TGApp.Plugins.Hutao.Base.Rate<string>>;
    Weapons: Array<TGApp.Plugins.Hutao.Base.Rate>;
  }

  /**
   * @description 获取武器搭配角色返回
   * @since Alpha v0.2.1
   * @see HutaoRequest.Abyss.weapon.getCollect
   * @interface WeaponCollocationResponse
   * @extends TGApp.Plugins.Hutao.Base.Response
   * @property {WeaponCollocation[]} data - 武器搭配角色
   */
  interface WeaponCollocationResponse extends TGApp.Plugins.Hutao.Base.Response {
    data: WeaponCollocation[];
  }

  /**
   * @description 武器搭配角色
   * @since Alpha v0.2.1
   * @interface WeaponCollocation
   * @property {number} WeaponId - 武器ID
   * @property {Array<TGApp.Plugins.Hutao.Base.Rate>} Avatars - 角色搭配率
   * @return WeaponCollocation
   */
  interface WeaponCollocation {
    WeaponId: number;
    Avatars: Array<TGApp.Plugins.Hutao.Base.Rate>;
  }

  /**
   * @description 获取队伍搭配返回
   * @since Alpha v0.2.1
   * @see HutaoRequest.Abyss.getTeamCollect
   * @interface TeamCombinationResponse
   * @extends TGApp.Plugins.Hutao.Base.Response
   * @property {TeamCombination[]} data - 队伍搭配
   * @return TeamCombinationResponse
   */
  interface TeamCombinationResponse extends TGApp.Plugins.Hutao.Base.Response {
    data: TeamCombination[];
  }

  /**
   * @description 队伍搭配
   * @since Alpha v0.2.1
   * @interface TeamCombination
   * @property {number} Floor - 楼层
   * @property {Array<TGApp.Plugins.Hutao.Base.Rate<string>>} Up - 统计次数
   * @property {Array<TGApp.Plugins.Hutao.Base.Rate<string>>} Down - 统计次数
   * @return TeamCombination
   */
  interface TeamCombination {
    Floor: number;
    Up: Array<TGApp.Plugins.Hutao.Base.Rate<string>>;
    Down: Array<TGApp.Plugins.Hutao.Base.Rate<string>>;
  }
}
