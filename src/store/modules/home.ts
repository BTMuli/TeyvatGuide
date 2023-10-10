/**
 * @file store modules home.ts
 * @description Home store module
 * @since Alpha v0.1.6
 */

import { defineStore } from "pinia";
import { ref } from "vue";

export const useHomeStore = defineStore(
  "home",
  () => {
    const calendarShow = ref({
      show: true,
      order: 3,
    });
    const poolShow = ref({
      show: true,
      order: 1,
    });
    const positionShow = ref({
      show: true,
      order: 2,
    });
    const homeShow = ref({
      calendarShow,
      poolShow,
      positionShow,
    });
    const poolCover = ref({} satisfies Record<number, string>);

    function init(): void {
      calendarShow.value = {
        show: true,
        order: 3,
      };
      poolShow.value = {
        show: true,
        order: 1,
      };
      positionShow.value = {
        show: true,
        order: 2,
      };
      poolCover.value = {};
    }

    function getShowItems(): string[] {
      const defaultList = ["素材日历", "限时祈愿", "近期活动"];
      defaultList.sort((a, b) => {
        return getItemOrder(a) - getItemOrder(b);
      });
      return defaultList;
    }

    function getShowValue(): string[] {
      const showValue = [];
      if (calendarShow.value.show) showValue.push("素材日历");
      if (poolShow.value.show) showValue.push("限时祈愿");
      if (positionShow.value.show) showValue.push("近期活动");
      showValue.sort((a, b) => {
        return getItemOrder(a) - getItemOrder(b);
      });
      return showValue;
    }

    function getItemOrder(item: string): number {
      if (item === "素材日历") return calendarShow.value.order;
      if (item === "限时祈愿") return poolShow.value.order;
      if (item === "近期活动") return positionShow.value.order;
      return 4;
    }

    function setShowValue(value: string[]): void {
      let order = 1;
      // 遍历 value
      value.forEach((item) => {
        if (!getShowItems().includes(item)) {
          throw new Error("传入的值不在可选范围内");
        }
        if (item === "素材日历") {
          calendarShow.value.order = order;
          calendarShow.value.show = true;
          order++;
        }
        if (item === "限时祈愿") {
          poolShow.value.order = order;
          poolShow.value.show = true;
          order++;
        }
        if (item === "近期活动") {
          positionShow.value.order = order;
          positionShow.value.show = true;
          order++;
        }
      });
      // 遍历 getShowItems()
      getShowItems().forEach((item) => {
        if (!value.includes(item)) {
          if (item === "素材日历") {
            calendarShow.value.show = false;
          }
          if (item === "限时祈愿") {
            poolShow.value.show = false;
          }
          if (item === "近期活动") {
            positionShow.value.show = false;
          }
        }
      });
    }

    return {
      homeShow,
      poolCover,
      init,
      getShowItems,
      getShowValue,
      setShowValue,
    };
  },
  {
    persist: true,
  },
);
