/**
 * @file store/modules/home.ts
 * @description Home store module
 * @since Beta v0.6.5
 */

import { defineStore } from "pinia";
import { ref } from "vue";

export const enum ShowItemEnum {
  calendar = "素材日历",
  pool = "限时祈愿",
  position = "近期活动",
}

export type ShowItem = { show: boolean; order: number; label: ShowItemEnum };

export const useHomeStore = defineStore("home", () => {
  const homeShow = ref<Array<ShowItem>>([
    { show: true, order: 1, label: ShowItemEnum.pool },
    { show: true, order: 2, label: ShowItemEnum.position },
    { show: true, order: 3, label: ShowItemEnum.calendar },
  ]);
  const poolCover = ref<Record<number, string>>();

  function getShowItems(): Array<ShowItemEnum> {
    const homeShowLocal = localStorage.getItem("homeShow");
    if (homeShowLocal === null || !Array.isArray(JSON.parse(homeShowLocal))) {
      localStorage.setItem("homeShow", JSON.stringify(homeShow.value));
    }
    homeShow.value = JSON.parse(localStorage.getItem("homeShow")!);
    return homeShow.value
      .filter((item) => item.show)
      .sort((a, b) => a.order - b.order)
      .map((item) => item.label);
  }

  function setShowItems(items: Array<ShowItemEnum>): void {
    let order = 1;
    for (const item of items) {
      const findIdx = homeShow.value.findIndex((i) => i.label === item);
      if (findIdx === -1) continue;
      homeShow.value[findIdx].show = true;
      homeShow.value[findIdx].order = order++;
    }
    for (const item of homeShow.value) if (!items.includes(item.label)) item.show = false;
    localStorage.setItem("homeShow", JSON.stringify(homeShow.value));
  }

  return { poolCover, getShowItems, setShowItems };
});
