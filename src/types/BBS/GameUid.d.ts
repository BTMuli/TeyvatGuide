/**
 * 米游社回复 UID 卡片类型定义文件
 * @since Beta v0.12.6
 */

declare namespace TGApp.BBS.GameUid {
  /**
   * UID 卡片游戏账号信息
   * @since Beta v0.12.6
   */
  type Info = {
    /** 游戏业务标识，例如 hk4e_cn */
    game_biz: string;
    /** 游戏名称 */
    game_name: string;
    /** 游戏 UID */
    game_uid: string;
    /** 游戏等级 */
    level: number;
    /** 游戏昵称 */
    nickname: string;
    /** 游戏区域名称 */
    region_name: string;
  };

  /**
   * UID 卡片结构化节点内容
   * @since Beta v0.12.6
   */
  type Insert = {
    /** UID 卡片信息 */
    game_user_info: Info;
  };

  /**
   * UID 卡片结构化节点
   * @since Beta v0.12.6
   */
  type Node = {
    /** UID 卡片节点内容 */
    insert: Insert;
  };
}
