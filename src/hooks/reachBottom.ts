/**
 * @file hooks/reachBottom.ts
 * @description 触底检测
 * @since Beta v0.7.7
 */

import { onMounted, onUnmounted, ref, Ref } from "vue";

type ReachBottomReturn = {
  isReachBottom: Ref<boolean>;
};

/**
 * @function usePageReachBottom
 * @description 页面触底检测
 * @since Beta v0.7.7
 * @return ReachBottomReturn
 */
export function usePageReachBottom(): ReachBottomReturn {
  const isReachBottom = ref<boolean>(false);

  const handleScroll = () => {
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    const clientHeight = document.documentElement.clientHeight || document.body.clientHeight;
    const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;

    // 检测是否触底
    isReachBottom.value = scrollTop + clientHeight >= scrollHeight - 1; // 减1是为了避免浮点数误差
  };

  // 监听滚动事件
  onMounted(() => {
    window.addEventListener("scroll", handleScroll);
    // 初始检测
    handleScroll();
  });
  onUnmounted(() => {
    window.removeEventListener("scroll", handleScroll);
  });
  return { isReachBottom };
}
