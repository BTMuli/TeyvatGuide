/**
 * 圣遗物相关辅助函数
 * @since 0.11.0
 */

import { AppPropMapData, wrMainLv, wrMainProp, wrSub } from "@/data/index.js";

/**
 * 获取部位描述
 * @since 0.11.0
 * @param pos - 部位索引
 * @returns 部位描述
 */
function getPosName(pos: number): string {
  const relicPos = ["生之花", "死之羽", "时之沙", "空之杯", "理之冠"];
  return relicPos[pos - 1];
}

/**
 * 解析主词条
 * @since 0.11.0
 * @param id - 从Yae获取的主词条ID
 * @param star - 星级
 * @param level - 等级
 * @returns 主词条信息
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
 * 解析副词条
 * @since 0.11.0
 * @param list - 副词条列表
 * @returns 副词条信息
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

const relicUtils = {
  pos: getPosName,
  mp: parseMainProp,
  sp: parseSubProps,
};

export default relicUtils;
