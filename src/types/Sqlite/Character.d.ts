/**
 * 角色相关类型定义文件
 * @since Beta v0.5.3
 */

declare namespace TGApp.Sqlite.Character {
  /**
   * 角色表数据
   * @since Beta v0.5.3
   * @remarks UserCharacters 表
   */
  type TableRaw = {
    /** 用户 UID */
    uid: number;
    /** 角色 ID */
    cid: number;
    /**
     * 角色信息
     * @remarks 序列化，反序列化后是 {@link TGApp.Game.Avatar.Avatar} 类型
     */
    avatar: string;
    /**
     * 武器信息
     * @remarks 序列化，反序列化后是 {@link TGApp.Game.Avatar.WeaponDetail} 类型
     */
    weapon: string;
    /**
     * 圣遗物信息
     * @remarks 序列化，反序列化后是 {@link TGApp.Game.Avatar.Relic} 数组
     */
    relics: string;
    /**
     * 命座信息
     * @remarks 序列化，反序列化后是 {@link TGApp.Game.Avatar.Constellation} 数组
     */
    constellations: string;
    /**
     * 衣装信息
     * @remarks 序列化，反序列化后是 {@link TGApp.Game.Avatar.Costume} 数组
     */
    costumes: string;
    /**
     * 技能信息
     * @remarks 序列化，反序列化后是 {@link TGApp.Game.Avatar.Skill} 数组
     */
    skills: string;
    /**
     * 角色属性信息
     * @remarks 序列化，反序列化后是 {@link TGApp.Game.Avatar.Prop} 数组
     */
    propSelected: string;
    /**
     * 角色基础属性信息
     * @remarks 序列化，反序列化后是 {@link TGApp.Game.Avatar.Prop} 数组
     */
    propBase: string;
    /**
     * 角色额外属性信息
     * @remarks 序列化，反序列化后是 {@link TGApp.Game.Avatar.Prop} 数组
     */
    propExtra: string;
    /**
     * 角色推荐属性信息
     * @remarks 序列化，反序列化后是 {@link TGApp.Game.Avatar.RelicRecommendProp} 类型
     */
    propRecommend: string;
    /** 更新时间 */
    updated: string;
  };

  /**
   * 用户角色列表的角色类型
   * @since Beta v0.5.3
   * @remarks 解析自 {@link TableRaw} 数据
   */
  type TableTrans = {
    /** 用户 UID */
    uid: number;
    /** 角色 ID */
    cid: number;
    /** 角色信息 */
    avatar: TGApp.Game.Avatar.Avatar;
    /** 武器信息 */
    weapon: TGApp.Game.Avatar.WeaponDetail;
    /** 圣遗物信息 */
    relics: Array<TGApp.Game.Avatar.Relic>;
    /** 命座信息 */
    constellations: Array<TGApp.Game.Avatar.Constellation>;
    /** 衣装信息 */
    costumes: Array<TGApp.Game.Avatar.Costume>;
    /** 技能信息 */
    skills: Array<TGApp.Game.Avatar.Skill>;
    /** 角色属性信息 */
    propSelected: Array<TGApp.Game.Avatar.Prop>;
    /** 角色基础属性信息 */
    propBase: string;
    /** 角色额外属性信息 */
    propExtra: Array<TGApp.Game.Avatar.Prop>;
    /** 角色推荐属性信息 */
    propRecommend: TGApp.Game.Avatar.RelicRecommendProp;
    /** 更新时间 */
    updated: string;
  };
}
