/**
 * Hakushi插件相关类型
 * @since Beta v0.9.0
 */

declare namespace TGApp.Plugins.Hakushi {
  /**
   * 武器JSON返回
   * @since Beta v0.9.0
   * @see https://api.hakush.in/gi/data/weapon.json
   */
  type WeaponResp = Record<string, WeaponBrief>;

  /**
   * 角色JSON返回
   * @since Beta v0.9.0
   * @see https://api.hakush.in/gi/data/character.json
   */
  type AvatarResp = Record<string, AvatarBrief>;

  /**
   * 武器信息
   * @since Beta v0.9.0
   */
  type WeaponBrief = {
    /** 图标 */
    icon: string;
    /** 稀有度 */
    rank: number;
    /**
     * 类型
     * @remarks 枚举
     * @example
     * - WEAPON_BOW 弓
     */
    type: string;
    /** 英文译名 */
    EN: string;
    /** 描述（英文） */
    desc: string;
    /** 韩文译名 */
    KR: string;
    /** 中文译名 */
    CHS: string;
    /** 日文译名 */
    JP: string;
  };

  /**
   * 角色信息
   * @since Beta v0.9.0
   */
  type AvatarBrief = {
    /** 生日 */
    birth: Array<number>;
    /** 图标 */
    icon: string;
    /** 稀有度 */
    rank: number;
    /**
     * 武器类型
     * @remarks 枚举
     * @example
     * - WEAPON_BOW 弓
     */
    weapon: string;
    /** 上线时间 */
    release: string;
    /** 元素 */
    element: string;
    /** 英文译名 */
    EN: string;
    /** 描述（英文） */
    desc: string;
    /** 韩文译名 */
    KR: string;
    /** 中文译名 */
    CHS: string;
    /** 日文译名 */
    JP: string;
  };

  /**
   * 转换后的数据
   * @since Beta v0.9.1
   */
  type ConvertData = {
    /** ID */
    id: string;
    /** 名称 */
    name: string;
    /** 类型 */
    type: "武器" | "角色";
    /** 星级 */
    star: number;
  };
}
