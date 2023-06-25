/**
 * @file types Plugins Hutao.d.ts
 * @description Hutao API
 * @see HutaoRequest
 * @author BTMuli <bt-muli@outlook.com>
 * @since Alpha v0.2.0
 */

declare namespace TGApp.Plugins.Hutao {
  /**
   * @description Hutao API 响应数据
   * @since Alpha v0.2.0
   * @interface HutaoResponse
   * @property {number} retcode - 状态码
   * @property {string} message - 状态信息
   * @property {any} data - 数据
   */
  export interface HutaoResponse {
    retcode?: number;
    message?: string;
    data?: any;
  }
  /**
   * @description 深渊记录上传数据
   * @since Alpha v0.2.0
   * @see HutaoRequest.Abyss.postData
   * @interface AbyssRecordUpload
   * @property {string} uid - UID
   * @property {string} identity - 身份标识
   * @property {AbyssRecord} spiralAbyss - 深渊记录
   * @property {AbyssAvatar[]} avatars - 角色信息
   * @property {string} reservedUserName - 保留用户名
   * @return AbyssRecordUpload
   */
  export interface AbyssRecordUpload {
    uid: string;
    identity: string;
    spiralAbyss: AbyssRecord;
    avatars: AbyssAvatar[];
    reservedUserName: string;
  }

  /**
   * @description 深渊记录
   * @since Alpha v0.2.0
   * @interface AbyssRecord
   * @property {number} scheduleId - 深渊期数
   * @property {number} totalBattleTimes - 总战斗次数
   * @property {number} totalWinTimes - 总胜利次数
   * @property {number} damage.avatarId - 最大伤害角色ID
   * @property {number} damage.value - 最大伤害
   * @property {number} takeDamage.avatarId - 最大承伤角色ID
   * @property {number} takeDamage.value - 最大承伤
   * @property {AbyssFloor[]} floors - 楼层信息
   * @return AbyssRecord
   */
  export interface AbyssRecord {
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
    floors: AbyssFloor[];
  }

  /**
   * @description 深渊楼层信息
   * @since Alpha v0.2.0
   * @interface AbyssFloor
   * @property {number} index - 楼层索引
   * @property {number} star - 楼层星数
   * @property {AbyssLevel[]} levels - 楼层关卡信息
   * @return AbyssFloor
   */
  export interface AbyssFloor {
    index: number;
    star: number;
    levels: AbyssLevel[];
  }

  /**
   * @description 深渊关卡信息
   * @since Alpha v0.2.0
   * @interface AbyssLevel
   * @property {number} index - 关卡索引
   * @property {number} star - 关卡星数
   * @property {number} battles[].index - 战斗索引
   * @property {number[]} battles[].avatars - 战斗角色ID
   * @return AbyssLevel
   */
  export interface AbyssLevel {
    index: number;
    star: number;
    battles: Array<{
      index: number;
      avatars: number[];
    }>;
  }

  /**
   * @description 角色信息
   * @since Alpha v0.2.0
   * @interface AbyssAvatar
   * @property {number} avatarId - 角色ID
   * @property {number} weaponId - 武器ID
   * @property {string[]} reliquarySetIds - 圣遗物套装ID // id-pos
   * @property {number} activedConstellationNumber - 已激活命座数量
   * @return AbyssAvatar
   */
  export interface AbyssAvatar {
    avatarId: number;
    weaponId: number;
    reliquarySetIds: string[];
    activedConstellationNumber: number;
  }

  /**
   * @description 查询 uid 对应记录是否存在返回
   * @since Alpha v0.2.0
   * @see HutaoRequest.Abyss.user.checkExist
   * @interface AbyssRecordExistResponse
   * @extends HutaoResponse
   * @property {boolean} data - 是否存在
   * @return AbyssRecordExistResponse
   */
  export interface AbyssRecordExistResponse extends HutaoResponse {
    data: boolean;
  }

  /**
   * @description 获取深渊记录返回
   * @todo 暂时缺乏数据
   * @since Alpha v0.2.0
   * @see HutaoRequest.Abyss.user.getRecord
   * @interface AbyssRecordRankResponse
   * @extends HutaoResponse
   * @property {AbyssRecordRank} data - 深渊记录
   * @return AbyssRecordRankResponse
   */
  export interface AbyssRecordRankResponse extends HutaoResponse {
    data: AbyssRecordRank;
  }

  /**
   * @description 深渊记录
   * @since Alpha v0.2.0
   * @interface AbyssRecordRank
   * @todo 暂时缺乏数据
   * @return AbyssRecordRank
   */
  export interface AbyssRecordRank {
    // todo
  }

  /**
   * @description 获取深渊总览数据返回
   * @since Alpha v0.2.0
   * @see HutaoRequest.Abyss.getOverview
   * @interface AbyssOverviewResponse
   * @extends HutaoResponse
   * @property {AbyssOverview} data - 深渊总览数据
   * @return AbyssOverviewResponse
   */
  export interface AbyssOverviewResponse extends HutaoResponse {
    data: AbyssOverview;
  }

  /**
   * @description 深渊总览数据
   * @since Alpha v0.2.0
   * @interface AbyssOverview
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
   * @return AbyssOverview
   */
  export interface AbyssOverview {
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
   * @method GET
   * @interface AbyssAvatarUpRateResponse
   * @extends HutaoResponse
   * @property {AbyssAvatarUpRate[]} data - 角色深渊上场率
   * @return AbyssAvatarUpRateResponse
   */
  export interface AbyssAvatarUpRateResponse extends HutaoResponse {
    data: AbyssAvatarUpRate[];
  }

  /**
   * @description 角色深渊上场率
   * @since Alpha v0.2.0
   * @interface AbyssAvatarUpRate
   * @property {number} floor - 楼层
   * @property {number} ranks[].item - 角色ID
   * @property {number} ranks[].rate - 上场率
   * @return AbyssAvatarUpRate
   */
  export interface AbyssAvatarUpRate {
    floor: number;
    ranks: {
      item: number;
      rate: number;
    };
  }

  /**
   * @description 获取角色深渊使用率返回
   * @since Alpha v0.2.0
   * @see HutaoRequest.Abyss.avatar.getUseRate
   * @interface AbyssAvatarUseRateResponse
   * @extends HutaoResponse
   * @property {AbyssAvatarUseRate[]} data - 角色深渊使用率
   * @return AbyssAvatarUseRateResponse
   */
  export interface AbyssAvatarUseRateResponse extends HutaoResponse {
    data: AbyssAvatarUseRate[];
  }

  /**
   * @description 角色深渊使用率
   * @since Alpha v0.2.0
   * @interface AbyssAvatarUseRate
   * @property {number} floor - 楼层
   * @property {number} ranks[].item - 角色ID
   * @property {number} ranks[].rate - 使用率
   * @return AbyssAvatarUseRate
   */
  export interface AbyssAvatarUseRate {
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
   * @interface AbyssAvatarHoldRateResponse
   * @extends HutaoResponse
   * @property {AbyssAvatarHoldRate[]} data - 角色深渊持有率
   * @return AbyssAvatarHoldRateResponse
   */
  export interface AbyssAvatarHoldRateResponse extends HutaoResponse {
    data: AbyssAvatarHoldRate[];
  }

  /**
   * @description 角色深渊持有率
   * @since Alpha v0.2.0
   * @interface AbyssAvatarHoldRate
   * @property {number} holdingRate - 持有率
   * @property {number} constellations[].item - 命座ID
   * @property {number} constellations[].rate - 持有率
   * @property {number} avatarId - 角色ID
   * @return AbyssAvatarHoldRate
   */
  export interface AbyssAvatarHoldRate {
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
   * @interface AbyssAvatarCollocationResponse
   * @extends HutaoResponse
   * @property {AbyssAvatarCollocation[]} data - 角色搭配
   * @return AbyssAvatarCollocationResponse
   */
  export interface AbyssAvatarCollocationResponse extends HutaoResponse {
    data: AbyssAvatarCollocation[];
  }

  /**
   * @description 角色搭配
   * @since Alpha v0.2.0
   * @interface AbyssAvatarCollocation
   * @property {number} avatarId - 角色ID
   * @property {number} avatars[].item - 角色ID
   * @property {number} avatars[].rate - 角色搭配率
   * @property {string} reliquaries[].item - 圣遗物套装ID // id-num,id-num
   * @property {number} reliquaries[].rate - 圣遗物套装搭配率
   * @property {number} weapons[].item - 武器ID
   * @property {number} weapons[].rate - 武器搭配率
   * @return AbyssAvatarCollocation
   */
  export interface AbyssAvatarCollocation {
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
   * @interface AbyssWeaponCollocationResponse
   * @extends HutaoResponse
   * @property {AbyssWeaponCollocation[]} data - 武器搭配角色
   */
  export interface AbyssWeaponCollocationResponse extends HutaoResponse {
    data: AbyssWeaponCollocation[];
  }

  /**
   * @description 武器搭配角色
   * @since Alpha v0.2.0
   * @interface AbyssWeaponCollocation
   * @property {number} weaponId - 武器ID
   * @property {number} avatars[].item - 角色ID
   * @property {number} avatars[].rate - 角色搭配率
   * @return AbyssWeaponCollocation
   */
  export interface AbyssWeaponCollocation {
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
   * @interface AbyssTeamCombinationResponse
   * @extends HutaoResponse
   * @property {AbyssTeamCombination[]} data - 队伍搭配
   * @return AbyssTeamCombinationResponse
   */
  export interface AbyssTeamCombinationResponse extends HutaoResponse {
    data: AbyssTeamCombination[];
  }

  /**
   * @description 队伍搭配
   * @since Alpha v0.2.0
   * @interface AbyssTeamCombination
   * @property {number} floor - 楼层
   * @property {string} up[].item - 角色ID // id,id,id,id
   * @property {number} up[].rate - 统计次数
   * @property {string} down[].item - 角色ID // id,id,id,id
   * @property {number} down[].rate - 统计次数
   * @return AbyssTeamCombination
   */
  export interface AbyssTeamCombination {
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
