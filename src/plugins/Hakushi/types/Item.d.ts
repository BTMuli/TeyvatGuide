/**
 * @file plugins/Hakushi/types/Item.d.ts
 * @description Hakushi API 类型定义
 * @since Beta v0.8.8
 */

/**
 * @description Hakushi API namespace
 * @since Beta v0.8.8
 * @namespace TGApp.Plugins.Hakushi
 */
declare namespace TGApp.Plugins.Hakushi {
  /**
   * @description 角色数据
   * @since Beta v0.8.8
   * @property {string} id - 角色 ID
   * @property {string} name - 角色名称
   * @property {number} star - 角色星级
   */
  interface Character {
    id: string;
    name: string;
    star: number;
  }

  /**
   * @description 武器数据
   * @since Beta v0.8.8
   * @property {string} id - 武器 ID
   * @property {string} name - 武器名称
   * @property {number} star - 武器星级
   */
  interface Weapon {
    id: string;
    name: string;
    star: number;
  }

  /**
   * @description API 响应类型 - 角色
   * @since Beta v0.8.8
   */
  type CharacterResponse = Record<string, Character>;

  /**
   * @description API 响应类型 - 武器
   * @since Beta v0.8.8
   */
  type WeaponResponse = Record<string, Weapon>;
}
