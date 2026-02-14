/**
 * Yatta 插件相关类型
 * @since Beta v0.9.6
 */

declare namespace TGApp.Plugins.Yatta {
  /**
   * 通用 Yatta 接口返回响应
   * @since Beta v0.9.6
   */
  type Resp<T = unknown> = {
    /** 回复码 */
    response: number;
    /** 数据 */
    data: T;
  };

  /**
   * 角色 JSON 返回
   * @since Beta v0.9.6
   * @see https://gi.yatta.moe/api/v2/chs/avatar
   */
  type AvatarResp = Resp<AvatarRes>;

  /**
   * 武器 JSON 返回
   * @since Beta v0.9.6
   * @see https://gi.yatta.moe/api/v2/chs/weapon
   */
  type WeaponResp = Resp<WeaponRes>;

  /**
   * 角色返回数据
   * @since Beta v0.9.6
   */
  type AvatarRes = {
    /**
     * 属性
     * @remarks 未使用
     */
    props: unknown;
    /**
     * 类型
     * @remarks 未使用
     */
    types: unknown;
    /** 角色列表 */
    items: Record<string, Avatar>;
  };

  /**
   * 角色数据
   * @since Beta v0.9.6
   */
  type Avatar = {
    /** ID */
    id: number;
    /** 星级 */
    rank: number;
    /** 名称 */
    name: string;
    /**
     * 元素类型
     * @example Fire
     */
    element: string;
    /**
     * 武器类型
     * @example WEAPON_CLAYMORE
     */
    weaponType: string;
    /**
     * 区域
     * @example MONDSTAT
     */
    region: string;
    /**
     * 特殊属性
     * @example FIGHT_PROP_CRITICAL
     */
    specialProp: string;
    /**
     * 体型
     * @example MALE
     */
    bodyType: string;
    /** 图标 */
    icon: string;
    /** 生日 */
    birthday: Array<number> & { length: 2 };
    /** 发行时间戳（秒） */
    release: number;
    /** 路由 */
    route: string;
  };

  /**
   * 武器返回数据
   * @since Beta v0.9.6
   */
  type WeaponRes = {
    /**
     * 属性
     * @remarks 未使用
     */
    props: unknown;
    /**
     * 类型
     * @remarks 未使用
     */
    types: unknown;
    /** 武器列表 */
    items: Record<string, Weapon>;
  };

  /**
   * 武器数据
   * @since Beta v0.9.6
   */
  type Weapon = {
    /** ID */
    id: number;
    /** 星级 */
    rank: number;
    /**
     * 武器类型
     * @example WEAPON_SWORD_ONE_HAND
     */
    type: string;
    /** 名称 */
    name: string;
    /**
     * 特殊属性
     * @example FIGHT_PROP_ELEMENT_MASTERY
     */
    specialProp: string;
    /** 图标 */
    icon: string;
    /** 路由 */
    route: string;
  };

  /**
   * 转换后的数据
   * @since Beta v0.9.6
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
