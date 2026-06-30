/**
 * Wiki相关辅助函数（武器、圣遗物）
 * @since Beta v0.11.0
 */

import { AppPropMapData, wrMainLv, wrMainProp, wrSub, wwCurve, wwPromote } from "@/data/index.js";

/**
 * 获取武器升级倍率
 * @param level - 武器等级
 * @param curveType - 属性类型
 * @returns 升级倍率
 */
function getCurveFactor(level: number, curveType: number): number {
  const levelData = wwCurve[level];
  if (!levelData) return 1;
  const find = levelData.find((i) => i.type === curveType);
  return find ? find.addVal : 1;
}

/**
 * 获取突破等级属性
 * @param weaponId - 武器ID
 * @param promoteLevel - 突破等级
 * @param propType - 属性类型
 * @returns 属性
 */
function getPromoteAddVal(weaponId: number, promoteLevel: number, propType: number): number {
  const weaponPromote = wwPromote[weaponId];
  if (!weaponPromote) return 0;
  const promoteData = weaponPromote[promoteLevel];
  if (!promoteData) return 0;
  const find = promoteData.find((i) => i.type === propType);
  return find ? find.addVal : 0;
}

/**
 * 获取武器属性
 * @param weapon - 武器信息
 * @param level - 等级
 * @param promoteLevel - 突破次数
 */
function getWeaponStats(
  weapon: TGApp.App.Weapon.WikiItem,
  level: number,
  promoteLevel: number,
): Array<TGApp.App.Weapon.WeaponProp> {
  const result: Array<TGApp.App.Weapon.WeaponProp> = [];
  for (const curve of weapon.curves) {
    const factor = getCurveFactor(level, curve.curve);
    const promoteAdd = getPromoteAddVal(weapon.id, promoteLevel, curve.prop);
    const propInfo = AppPropMapData[curve.prop];
    if (!propInfo) continue;
    result.push({
      type: curve.prop,
      val: curve.val * factor + promoteAdd,
      info: propInfo,
    });
  }
  return result;
}

/**
 * 格式化属性
 * @param type - 属性类型
 * @param val - 属性值
 * @returns 属性文本
 */
function formatProp(type: number, val: number): string {
  const percentTypes = [
    20, 23, 26, 27, 29, 3, 30, 40, 41, 42, 43, 44, 45, 46, 50, 51, 52, 53, 54, 55, 56, 6, 80, 81, 9,
  ];
  if (percentTypes.includes(type)) {
    return `${(val * 100).toFixed(1)}%`;
  }
  return Math.round(val).toString();
}

/**
 * 获取圣遗物名称
 * @param pos -圣遗物位置
 * @returns 圣遗物位置描述
 */
function getPosName(pos: number): string {
  const relicPos = ["生之花", "死之羽", "时之沙", "空之杯", "理之冠"];
  return relicPos[pos - 1];
}

/**
 * 解析圣遗物主属性
 * @param id - 圣遗物ID
 * @param star - 圣遗物星级
 * @param level - 圣遗物等级
 * @returns 主属性信息
 */
function parseMainProp(
  id: number,
  star: number,
  level: number,
): TGApp.App.Relic.MainPropInfo | false {
  const propType = wrMainProp[id];
  const lvFind = wrMainLv.find((i) => i.star === star && i.level === level);
  if (lvFind) {
    return {
      type: propType,
      val: lvFind.prop[propType],
      info: AppPropMapData[propType],
    };
  }
  return false;
}

/**
 * 解析圣遗物主属性
 * @param list - 副属性列表
 * @returns 副属性信息
 */
function parseSubProps(list: Array<number>): Array<TGApp.App.Relic.SubPropInfo> {
  const res: Array<TGApp.App.Relic.SubPropInfo> = [];
  for (const item of list) {
    const subProp = wrSub[item];
    const findIdx = res.findIndex((i) => i.type === subProp.type);
    if (findIdx !== -1) {
      res[findIdx] = {
        ...res[findIdx],
        vals: [...res[findIdx].vals, subProp.val],
        val: res[findIdx].val + subProp.val,
      };
    } else {
      res.push({
        type: subProp.type,
        val: subProp.val,
        vals: [subProp.val],
        info: AppPropMapData[subProp.type],
      });
    }
  }
  return res;
}

const wikiUtils = {
  weapon: getWeaponStats,
  propFmt: formatProp,
  relic: {
    pos: getPosName,
    mp: parseMainProp,
    sp: parseSubProps,
  },
};

export default wikiUtils;
