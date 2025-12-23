/**
 * Sqlite Account 类型定义文件
 * @since Beta v0.6.0
 */

declare namespace TGApp.Sqlite.Account {
  /**
   * 米社账号类型
   * @since Beta v0.6.0
   * @remarks UserAccount 表
   */
  type User = {
    /** 米社UID */
    uid: string;
    /**
     * 用户信息
     * @remarks 序列化，反序列化后是 {@link TGApp.App.Account.BriefInfo} 对象
     */
    brief: string;
    /** 用户Cookie */
    cookie: string;
    /** 更新时间 */
    updated: string;
  };

  /**
   * 游戏账号类型
   * @since Beta v0.6.0
   * @remarks GameAccount 表
   */
  type Game = {
    /** 米社UID */
    uid: string;
    /** 游戏Biz */
    gameBiz: string;
    /** 游戏UID */
    gameUid: string;
    /** 是否为当前选中账号 */
    isChosen: 0 | 1;
    /** 是否是官服账号 */
    isOfficial: 0 | 1;
    /** 游戏等级 */
    level: string;
    /** 游戏昵称 */
    nickname: string;
    /** 所在服务器 */
    region: string;
    /** 服务器名称 */
    regionName: string;
    /** 更新时间 */
    updated: string;
  };
}
