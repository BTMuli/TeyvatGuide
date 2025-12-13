/**
 * 首页组件状态
 * @since Beta v0.9.0
 */

import { defineStore } from "pinia";
import { ref } from "vue";

/**
 * 默认展示项
 */
const defaultHomeShow: Array<TGApp.Store.Home.ShowItem> = [
  { show: false, order: 4, label: "签到" },
  { show: true, order: 1, label: "限时祈愿" },
  { show: true, order: 2, label: "近期活动" },
  { show: true, order: 3, label: "素材日历" },
];

const useHomeStore = defineStore("home", () => {
  const homeShow = ref<Array<TGApp.Store.Home.ShowItem>>(defaultHomeShow);
  const poolCover = ref<Record<number, string>>();

  function getShowItems(): Array<string> {
    const homeShowLocal = localStorage.getItem("homeShow");
    if (homeShowLocal === null) {
      localStorage.setItem("homeShow", JSON.stringify(homeShow.value));
    } else {
      try {
        const storedItems: Array<TGApp.Store.Home.ShowItem> = JSON.parse(homeShowLocal);
        if (!Array.isArray(storedItems)) {
          // Invalid data, reset to default
          localStorage.setItem("homeShow", JSON.stringify(homeShow.value));
        } else {
          // Merge with default items to add new items
          const storedLabels = storedItems.map((i) => i.label);
          // Add new items from default that don't exist in stored
          for (const defaultItem of homeShow.value) {
            if (!storedLabels.includes(defaultItem.label)) {
              storedItems.push({ ...defaultItem });
            }
          }
          // Remove items that no longer exist in default
          const defaultLabels = homeShow.value.map((i) => i.label);
          homeShow.value = storedItems.filter((item) => defaultLabels.includes(item.label));
          localStorage.setItem("homeShow", JSON.stringify(homeShow.value));
        }
      } catch (e) {
        console.error(e);
        // Invalid JSON, reset to default
        localStorage.setItem("homeShow", JSON.stringify(homeShow.value));
      }
    }
    return homeShow.value
      .filter((item) => item.show)
      .sort((a, b) => a.order - b.order)
      .map((item) => item.label);
  }

  function init(): void {
    homeShow.value = defaultHomeShow;
    localStorage.setItem("homeShow", JSON.stringify(homeShow.value));
  }

  function setShowItems(items: Array<string>): void {
    let order = 1;
    for (const item of items) {
      const findIdx = homeShow.value.findIndex((i) => i.label === item);
      if (findIdx === -1) {
        // Add new item if it doesn't exist
        homeShow.value.push({ show: true, order: order++, label: item });
      } else {
        homeShow.value[findIdx].show = true;
        homeShow.value[findIdx].order = order++;
      }
    }
    for (const item of homeShow.value) if (!items.includes(item.label)) item.show = false;
    localStorage.setItem("homeShow", JSON.stringify(homeShow.value));
  }

  return { poolCover, getShowItems, setShowItems, init };
});

export default useHomeStore;
