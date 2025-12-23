/**
 * 深境螺旋
 * @since Beta v0.3.0
 */

declare namespace TGApp.Plugins.Hutao.Abyss {
  /**
   * 深渊记录上传数据
   * @since Alpha v0.2.1
   * @see HutaoRequest.Abyss.postData
   */
  type RecordUpload = {
    /** UID */
    Uid: string;
    /** 身份标识 */
    Identity: string;
    /** 深渊记录 */
    SpiralAbyss: RecordData;
    /** 角色信息 */
    Avatars: Array<Avatar>;
    /** 保留用户名 */
    ReservedUserName: string;
  };

  /**
   * 深渊记录
   * @since Alpha v0.2.2
   */
  type RecordData = {
    /** 深渊期数 */
    ScheduleId: number;
    /** 总战斗次数 */
    TotalBattleTimes: number;
    /** 总胜利次数 */
    TotalWinTimes: number;
    /** 最多击败数 */
    Defeat: {
      /** 最多击败数角色 ID */
      AvatarId: number;
      /** 最多击败数 */
      Value: number;
    };
    /** 最多元素爆发释放数 */
    EnergySkill: {
      /** 最多元素爆发角色 ID */
      AvatarId: number;
      /** 元素爆发释放数 */
      Value: number;
    };
    /** 最多元素战技释放数 */
    NormalSkill: {
      /** 最多元素战技角色 ID */
      AvatarId: number;
      /** 元素战技释放数 */
      Value: number;
    };
    /** 最大伤害 */
    Damage: {
      /** 最大伤害角色 ID */
      AvatarId: number;
      /** 最大伤害值 */
      Value: number;
    };
    /** 最大承伤 */
    TakeDamage: {
      /** 最大承伤角色 ID */
      AvatarId: number;
      /** 最大承伤值 */
      Value: number;
    };
    /** 楼层信息 */
    Floors: Array<Floor>;
  };

  /**
   * 深渊楼层信息
   * @since Alpha v0.2.1
   */
  type Floor = {
    /** 楼层索引 */
    Index: number;
    /** 楼层星数 */
    Star: number;
    /** 楼层关卡信息 */
    Levels: Array<Level>;
  };

  /**
   * 深渊房间信息
   * @since Alpha v0.2.1
   */
  type Level = {
    /** 关卡索引 */
    Index: number;
    /** 关卡星数 */
    Star: number;
    /** 战斗信息 */
    Battles: Array<{
      /** 战斗索引 */
      Index: number;
      /** 战斗角色 ID 列表 */
      Avatars: Array<number>;
    }>;
  };

  /**
   * 角色信息
   * @since Alpha v0.2.1
   */
  type Avatar = {
    /** 角色 ID */
    AvatarId: number;
    /** 武器 ID */
    WeaponId: number;
    /** 圣遗物套装 ID 列表 */
    ReliquarySetIds: Array<number>;
    /** 已激活命座数量 */
    ActivedConstellationNumber: number;
  };

  /**
   * 深渊记录上传返回
   * @since Alpha v0.2.1
   */
  type UploadResp = TGApp.Plugins.Hutao.Base.Resp;

  /**
   * 获取深渊总览数据返回
   * @since Alpha v0.2.1
   */
  type OverviewResp = TGApp.Plugins.Hutao.Base.Resp<OverviewData>;

  /**
   * 深渊总览数据
   * @since Alpha v0.2.1
   */
  type OverviewData = {
    /** 深渊期数 */
    ScheduleId: number;
    /** 总记录数 */
    RecordTotal: number;
    /** 总计深渊记录 */
    SpiralAbyssTotal: number;
    /** 满星深渊记录数 */
    SpiralAbyssFullStar: number;
    /** 通关深渊记录数 */
    SpiralAbyssPassed: number;
    /** 总星数 */
    SpiralAbyssStarTotal: number;
    /** 总战斗次数 */
    SpiralAbyssBattleTotal: number;
    /** 时间戳 */
    Timestamp: number;
    /** 总耗时 */
    TimeTotal: number;
    /** 平均耗时 */
    TimeAverage: number;
  };

  /**
   * 获取角色深渊上场率返回
   * @since Alpha v0.2.1
   */
  type AvatarUpResp = TGApp.Plugins.Hutao.Base.Resp<Array<AvatarUp>>;

  /**
   * 角色深渊上场率
   * @since Alpha v0.2.1
   */
  type AvatarUp = {
    /** 楼层 */
    Floor: number;
    /** 角色上场率 */
    Ranks: Array<TGApp.Plugins.Hutao.Base.Rate>;
  };

  /**
   * 获取角色深渊使用率返回
   * @since Alpha v0.2.1
   */
  type AvatarUseResp = TGApp.Plugins.Hutao.Base.Resp<Array<AvatarUse>>;

  /**
   * 角色深渊使用率
   * @since Alpha v0.2.1
   */
  type AvatarUse = {
    /** 楼层 */
    Floor: number;
    /** 角色使用率 */
    Ranks: Array<TGApp.Plugins.Hutao.Base.Rate>;
  };

  /**
   * 获取角色深渊持有率返回
   * @since Alpha v0.2.1
   */
  type AvatarHoldResp = TGApp.Plugins.Hutao.Base.Resp<Array<AvatarHold>>;

  /**
   * 角色深渊持有率
   * @since Alpha v0.2.1
   */
  type AvatarHold = {
    /** 持有率 */
    HoldingRate: number;
    /** 命座持有率 */
    Constellations: Array<TGApp.Plugins.Hutao.Base.Rate>;
    /** 角色 ID */
    AvatarId: number;
  };

  /**
   * 获取角色的圣遗物、武器搭配
   * @since Alpha v0.2.1
   */
  type AvatarCollectResp = TGApp.Plugins.Hutao.Base.Resp<Array<AvatarCollocation>>;

  /**
   * 角色搭配
   * @since Alpha v0.2.1
   */
  type AvatarCollocation = {
    /** 角色 ID */
    AvatarId: number;
    /** 搭配角色使用率 */
    Avatars: Array<TGApp.Plugins.Hutao.Base.Rate>;
    /** 圣遗物套装搭配率 */
    Reliquaries: Array<TGApp.Plugins.Hutao.Base.Rate<string>>;
    /** 武器搭配率 */
    Weapons: Array<TGApp.Plugins.Hutao.Base.Rate>;
  };

  /**
   * 获取武器搭配角色返回
   * @since Alpha v0.2.1
   */
  type WeaponCollectResp = TGApp.Plugins.Hutao.Base.Resp<Array<WeaponCollocation>>;

  /**
   * 武器搭配角色
   * @since Alpha v0.2.1
   */
  type WeaponCollocation = {
    /** 武器 ID */
    WeaponId: number;
    /** 搭配角色使用率 */
    Avatars: Array<TGApp.Plugins.Hutao.Base.Rate>;
  };

  /**
   * 获取队伍搭配返回
   * @since Alpha v0.2.1
   */
  type TeamCombineResp = TGApp.Plugins.Hutao.Base.Resp<Array<TeamCombination>>;

  /**
   * 队伍搭配
   * @since Alpha v0.2.1
   */
  type TeamCombination = {
    /** 楼层 */
    Floor: number;
    /** 上半场队伍统计 */
    Up: Array<TGApp.Plugins.Hutao.Base.Rate<string>>;
    /** 下半场队伍统计 */
    Down: Array<TGApp.Plugins.Hutao.Base.Rate<string>>;
  };
}
