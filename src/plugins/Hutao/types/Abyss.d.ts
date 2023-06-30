/**
 * @file src plugins Hutao types Abyss.d.ts
 * @description Hutao 插件深渊类型定义文件
 * @author BTMuli <bt-muli@outlook.com>
 * @since Alpha v0.2.1
 */

/**
 * @description Hutao 深渊类型定义
 * @since Alpha v0.2.1
 * @namespace Abyss
 * @exports TGApp.Plugins.Hutao.Abyss
 * @return Abyss
 */
declare namespace TGApp.Plugins.Hutao.Abyss {
  /**
   * @description 深渊记录上传数据
   * @since Alpha v0.2.1
   * @see HutaoRequest.Abyss.postData
   * @interface RecordUpload
   * @property {string} uid - UID
   * @property {string} identity - 身份标识
   * @property {RecordData} spiralAbyss - 深渊记录
   * @property {Avatar[]} avatars - 角色信息
   * @property {string} reservedUserName - 保留用户名
   * @return RecordUpload
   */
  export interface RecordUpload {
    uid: string;
    identity: string;
    spiralAbyss: RecordData;
    avatars: Avatar[];
    reservedUserName: string;
  }

  /**
   * @description 深渊记录
   * @since Alpha v0.2.0
   * @interface RecordData
   * @property {number} scheduleId - 深渊期数
   * @property {number} totalBattleTimes - 总战斗次数
   * @property {number} totalWinTimes - 总胜利次数
   * @property {number} damage.avatarId - 最大伤害角色ID
   * @property {number} damage.value - 最大伤害
   * @property {number} takeDamage.avatarId - 最大承伤角色ID
   * @property {number} takeDamage.value - 最大承伤
   * @property {Floor[]} floors - 楼层信息
   * @return RecordData
   */
  export interface RecordData {
    scheduleId: number;
    totalBattleTimes: number;
    totalWinTimes: number;
    damage: {
      avatarId: number;
      value: number;
    };
    takeDamage: {
      avatarId: number;
      value: number;
    };
    floors: Floor[];
  }

  /**
   * @description 深渊楼层信息
   * @since Alpha v0.2.0
   * @interface Floor
   * @property {number} index - 楼层索引
   * @property {number} star - 楼层星数
   * @property {Level[]} levels - 楼层关卡信息
   * @return Floor
   */
  export interface Floor {
    index: number;
    star: number;
    levels: Level[];
  }

  /**
   * @description 深渊房间信息
   * @since Alpha v0.2.0
   * @interface Level
   * @property {number} index - 关卡索引
   * @property {number} star - 关卡星数
   * @property {number} battles[].index - 战斗索引
   * @property {number[]} battles[].avatars - 战斗角色ID
   * @return Level
   */
  export interface Level {
    index: number;
    star: number;
    battles: Array<{
      index: number;
      avatars: number[];
    }>;
  }

  /**
   * @description 角色信息
   * @since Alpha v0.2.1
   * @interface Avatar
   * @property {number} avatarId - 角色ID
   * @property {number} weaponId - 武器ID
   * @property {number[]} reliquarySetIds - 圣遗物套装ID
   * @property {number} activedConstellationNumber - 已激活命座数量
   * @return Avatar
   */
  export interface Avatar {
    avatarId: number;
    weaponId: number;
    reliquarySetIds: number[];
    activedConstellationNumber: number;
  }

  /**
   * @description 深渊记录上传返回
   * @since Alpha v0.2.1
   * @see HutaoRequest.Abyss.postData
   * @interface UploadResponse
   * @extends TGApp.Plugins.Hutao.Base.Response
   * @return UploadResponse
   */
  export interface UploadResponse extends TGApp.Plugins.Hutao.Base.Response {}

  /**
   * @description 是否存在深渊记录返回
   * @since Alpha v0.2.1
   * @see HutaoRequest.Abyss.user.checkExist
   * @interface ExistResponse
   * @extends TGApp.Plugins.Hutao.Base.Response
   * @property {boolean} data - 是否存在深渊记录
   * @return ExistResponse
   */
  export interface ExistResponse extends TGApp.Plugins.Hutao.Base.Response {
    data: boolean;
  }

  /**
   * @description 获取深渊记录返回
   * @since Alpha v0.2.1
   * @see HutaoRequest.Abyss.user.getRecord
   * @interface RecordRankResponse
   * @extends TGApp.Plugins.Hutao.Base.Response
   * @property {RankData} data - 深渊记录
   * @return RecordRankResponse
   */
  export interface RecordRankResponse extends TGApp.Plugins.Hutao.Base.Response {
    data: RankData;
  }

  /**
   * @description 深渊记录
   * @since Alpha v0.2.1
   * @interface RankData
   * @todo 暂时缺乏数据
   * @return RankData
   */
  export interface RankData {
    // todo
    data: any;
  }

  /**
   * @description 获取深渊总览数据返回
   * @since Alpha v0.2.0
   * @see HutaoRequest.Abyss.getOverview
   * @interface OverviewResponse
   * @extends TGApp.Plugins.Hutao.Base.Response
   * @property {OverviewData} data - 深渊总览数据
   * @return OverviewResponse
   */
  export interface OverviewResponse extends TGApp.Plugins.Hutao.Base.Response {
    data: OverviewData;
  }

  /**
   * @description 深渊总览数据
   * @since Alpha v0.2.0
   * @interface OverviewData
   * @property {number} scheduleId - 深渊期数
   * @property {number} recordTotal - 总记录数
   * @property {number} spiralAbyssTotal - 总计深渊记录
   * @property {number} spiralAbyssFullStar - 满星深渊记录数
   * @property {number} spiralAbyssPassed - 通关深渊记录数
   * @property {number} spiralAbyssStarTotal - 总星数
   * @property {number} spiralAbyssBattleTotal - 总战斗次数
   * @property {number} timestamp - 时间戳
   * @property {number} timeTotal - 总耗时
   * @property {number} timeAverage - 平均耗时
   * @return OverviewData
   */
  export interface OverviewData {
    scheduleId: number;
    recordTotal: number;
    spiralAbyssTotal: number;
    spiralAbyssFullStar: number;
    spiralAbyssPassed: number;
    spiralAbyssStarTotal: number;
    spiralAbyssBattleTotal: number;
    timestamp: number;
    timeTotal: number;
    timeAverage: number;
  }

  /**
   * @description 获取角色深渊上场率返回
   * @since Alpha v0.2.0
   * @see HutaoRequest.Abyss.avatar.getUpRate
   * @interface AvatarUpResponse
   * @extends TGApp.Plugins.Hutao.Base.Response
   * @property {AvatarUp[]} data - 角色深渊上场率
   * @return AvatarUpResponse
   */
  export interface AvatarUpResponse extends TGApp.Plugins.Hutao.Base.Response {
    data: AvatarUp[];
  }

  /**
   * @description 角色深渊上场率
   * @since Alpha v0.2.1
   * @interface AvatarUp
   * @property {number} floor - 楼层
   * @property {number} ranks[].item - 角色ID
   * @property {number} ranks[].rate - 上场率
   * @return AvatarUp
   */
  export interface AvatarUp {
    floor: number;
    ranks: Array<{
      item: number;
      rate: number;
    }>;
  }

  /**
   * @description 获取角色深渊使用率返回
   * @since Alpha v0.2.0
   * @see HutaoRequest.Abyss.avatar.getUseRate
   * @interface AvatarUseResponse
   * @extends TGApp.Plugins.Hutao.Base.Response
   * @property {AvatarUse[]} data - 角色深渊使用率
   * @return AvatarUseResponse
   */
  export interface AvatarUseResponse extends TGApp.Plugins.Hutao.Base.Response {
    data: AvatarUse[];
  }

  /**
   * @description 角色深渊使用率
   * @since Alpha v0.2.0
   * @interface AvatarUse
   * @property {number} floor - 楼层
   * @property {number} ranks[].item - 角色ID
   * @property {number} ranks[].rate - 使用率
   * @return AvatarUse
   */
  export interface AvatarUse {
    floor: number;
    ranks: Array<{
      item: number;
      rate: number;
    }>;
  }

  /**
   * @description 获取角色深渊持有率返回
   * @since Alpha v0.2.0
   * @see HutaoRequest.Abyss.avatar.getHoldRate
   * @interface AvatarHoldResponse
   * @extends TGApp.Plugins.Hutao.Base.Response
   * @property {AvatarHold[]} data - 角色深渊持有率
   * @return AvatarHoldResponse
   */
  export interface AvatarHoldResponse extends TGApp.Plugins.Hutao.Base.Response {
    data: AvatarHold[];
  }

  /**
   * @description 角色深渊持有率
   * @since Alpha v0.2.0
   * @interface AvatarHold
   * @property {number} holdingRate - 持有率
   * @property {number} constellations[].item - 命座ID
   * @property {number} constellations[].rate - 持有率
   * @property {number} avatarId - 角色ID
   * @return AvatarHold
   */
  export interface AvatarHold {
    holdingRate: number;
    constellations: Array<{
      item: number;
      rate: number;
    }>;
    avatarId: number;
  }

  /**
   * @description 获取角色的圣遗物、武器搭配
   * @since Alpha v0.2.0
   * @see HutaoRequest.Abyss.avatar.getCollect
   * @interface AvatarCollocationResponse
   * @extends TGApp.Plugins.Hutao.Base.Response
   * @property {AvatarCollocation[]} data - 角色搭配
   * @return AvatarCollocationResponse
   */
  export interface AvatarCollocationResponse extends TGApp.Plugins.Hutao.Base.Response {
    data: AvatarCollocation[];
  }

  /**
   * @description 角色搭配
   * @since Alpha v0.2.0
   * @interface AvatarCollocation
   * @property {number} avatarId - 角色ID
   * @property {number} avatars[].item - 角色ID
   * @property {number} avatars[].rate - 角色搭配率
   * @property {string} reliquaries[].item - 圣遗物套装ID // id-num,id-num
   * @property {number} reliquaries[].rate - 圣遗物套装搭配率
   * @property {number} weapons[].item - 武器ID
   * @property {number} weapons[].rate - 武器搭配率
   * @return AvatarCollocation
   */
  export interface AvatarCollocation {
    avatarId: number;
    avatars: Array<{
      item: number;
      rate: number;
    }>;
    reliquaries: Array<{
      item: string;
      rate: number;
    }>;
    weapons: Array<{
      item: number;
      rate: number;
    }>;
  }

  /**
   * @description 获取武器搭配角色返回
   * @since Alpha v0.2.0
   * @see HutaoRequest.Abyss.weapon.getCollect
   * @interface WeaponCollocationResponse
   * @extends TGApp.Plugins.Hutao.Base.Response
   * @property {WeaponCollocation[]} data - 武器搭配角色
   */
  export interface WeaponCollocationResponse extends TGApp.Plugins.Hutao.Base.Response {
    data: WeaponCollocation[];
  }

  /**
   * @description 武器搭配角色
   * @since Alpha v0.2.0
   * @interface WeaponCollocation
   * @property {number} weaponId - 武器ID
   * @property {number} avatars[].item - 角色ID
   * @property {number} avatars[].rate - 角色搭配率
   * @return WeaponCollocation
   */
  export interface WeaponCollocation {
    weaponId: number;
    avatars: Array<{
      item: number;
      rate: number;
    }>;
  }

  /**
   * @description 获取队伍搭配返回
   * @since Alpha v0.2.0
   * @see HutaoRequest.Abyss.getTeamCollect
   * @interface TeamCombinationResponse
   * @extends TGApp.Plugins.Hutao.Base.Response
   * @property {TeamCombination[]} data - 队伍搭配
   * @return TeamCombinationResponse
   */
  export interface TeamCombinationResponse extends TGApp.Plugins.Hutao.Base.Response {
    data: TeamCombination[];
  }

  /**
   * @description 队伍搭配
   * @since Alpha v0.2.0
   * @interface TeamCombination
   * @property {number} floor - 楼层
   * @property {string} up[].item - 角色ID // id,id,id,id
   * @property {number} up[].rate - 统计次数
   * @property {string} down[].item - 角色ID // id,id,id,id
   * @property {number} down[].rate - 统计次数
   * @return TeamCombination
   */
  export interface TeamCombination {
    floor: number;
    up: Array<{
      item: string;
      rate: number;
    }>;
    down: Array<{
      item: string;
      rate: number;
    }>;
  }
}
