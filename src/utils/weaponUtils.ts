/**
 * 武器相关辅助函数
 * @since Beta v0.11.0
 */

import { AppPropMapData, wwCurve, wwPromote } from "@/data/index.js";

/**
 * 计算武器属性结果
 * @since Beta v0.11.0
 */
type WeaponStatResult = {
  type: number;
  val: number;
  info: TGApp.Game.Avatar.PropMapItem;
};

/**
 * 获取指定等级的曲线系数
 * @since Beta v0.11.0
 * @param level - 武器等级(1-90)
 * @param curveType - 曲线类型ID
 * @returns 曲线系数，未找到返回1
 */
function getCurveFactor(level: number, curveType: number): number {
  const levelData = wwCurve[level];
  if (!levelData) return 1;
  const find = levelData.find((i) => i.type === curveType);
  return find ? find.addVal : 1;
}

/**
 * 获取突破增加的属性值
 * @since Beta v0.11.0
 * @param weaponId - 武器ID
 * @param promoteLevel - 突破等级
 * @param propType - 属性类型
 * @returns 属性增加值，未找到返回0
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
 * 计算武器在指定等级和突破等级下的属性数值
 * @since Beta v0.11.0
 * @remarks 公式：属性值 = 初始值 × 曲线系数 + 突破增加值
 * @param weapon - 武器Wiki数据
 * @param level - 武器等级(1-90)
 * @param promoteLevel - 突破等级(0-6)
 * @returns 属性结果列表
 */
function getWeaponStats(
  weapon: TGApp.App.Weapon.WikiItem,
  level: number,
  promoteLevel: number,
): Array<WeaponStatResult> {
  const result: Array<WeaponStatResult> = [];
  for (const curve of weapon.curves) {
    const factor = getCurveFactor(level, curve.curve);
    const promoteAdd = getPromoteAddVal(weapon.id, promoteLevel, curve.prop);
    const propInfo = AppPropMapData[curve.prop];
    if (!propInfo) continue;
    let finalVal = curve.val * factor + promoteAdd;
    if (curve.prop === 4) {
      finalVal = Math.round(finalVal);
    }
    result.push({
      type: curve.prop,
      val: finalVal,
      info: propInfo,
    });
  }
  return result;
}

/**
 * 格式化属性数值显示
 * @since Beta v0.11.0
 * @param type - 属性类型
 * @param val - 属性值
 * @returns 格式化后的字符串
 */
function formatStatVal(type: number, val: number): string {
  const percentTypes = [
    20, 26, 27, 29, 3, 30, 40, 41, 42, 43, 44, 45, 46, 50, 51, 52, 53, 54, 55, 56, 6, 80, 81, 9,
  ];
  if (percentTypes.includes(type)) {
    return `${(val * 100).toFixed(1)}%`;
  }
  return Math.round(val).toString();
}

const weaponUtils = {
  stats: getWeaponStats,
  format: formatStatVal,
};

export default weaponUtils;
