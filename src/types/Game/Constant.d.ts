/**
 * @file types Game Constant.d.ts
 * @description 游戏常量类型定义文件
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.5
 */

declare namespace TGApp.Game.Constant {
  /**
   * @description 七元素
   * @since Alpha v0.1.5
   * @enum {string}
   * @property {string} pyro - 火元素
   * @property {string} hydro - 水元素
   * @property {string} anemo - 风元素
   * @property {string} electro - 雷元素
   * @property {string} cryo - 冰元素
   * @property {string} geo - 岩元素
   * @property {string} dendro - 草元素
   */
  export enum EnumElement {
    pyro = "火元素",
    hydro = "水元素",
    anemo = "风元素",
    electro = "雷元素",
    cryo = "冰元素",
    geo = "岩元素",
    dendro = "草元素",
  }

  /**
   * @description 七元素-英文
   * @since Alpha v0.2.0
   * @enum {string}
   * @property {string} pyro - 火元素
   * @property {string} hydro - 水元素
   * @property {string} anemo - 风元素
   * @property {string} electro - 雷元素
   * @property {string} cryo - 冰元素
   * @property {string} geo - 岩元素
   * @property {string} dendro - 草元素
   */
  export enum EnumElementEn {
    pyro = "Pyro",
    hydro = "Hydro",
    anemo = "Anemo",
    electro = "Electro",
    cryo = "Cryo",
    geo = "Geo",
    dendro = "Dendro",
  }

  /**
   * @description 武器类型
   * @since Alpha v0.1.5
   * @enum {string}
   * @property {string} sword - 单手剑
   * @property {string} claymore - 双手剑
   * @property {string} pole - 长柄武器
   * @property {string} bow - 弓
   * @property {string} catalyst - 法器
   */
  export enum EnumWeapon {
    sword = "单手剑",
    claymore = "双手剑",
    pole = "长柄武器",
    bow = "弓",
    catalyst = "法器",
  }

  /**
   * @description 圣遗物位置
   * @since Alpha v0.2.0
   * @enum {string}
   * @property {string} flower - 生之花
   * @property {string} feather - 死之羽
   * @property {string} sands - 时之沙
   * @property {string} goblet - 空之杯
   * @property {string} circlet - 理之冠
   */
  export enum EnumRelic {
    flower = "生之花",
    feather = "死之羽",
    sands = "时之沙",
    goblet = "空之杯",
    circlet = "理之冠",
  }
}
