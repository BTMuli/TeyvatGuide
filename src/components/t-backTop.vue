<template>
  <transition name="fade">
    <div v-show="canTop" class="back-top" @click="handleScrollTop">
      <img src="../assets/icons/arrow-top.svg" alt="back-icon">
    </div>
  </transition>
</template>
<script lang="ts" setup>
// vue
import { ref, onMounted } from "vue";

const scrollTop = ref(0); // 滚动条距离顶部的距离
const canTop = ref(false); // 默认不显示

// 监听滚动事件
function handleScroll () {
  scrollTop.value = document.documentElement.scrollTop || document.body.scrollTop;
  // 超过500px显示回到顶部按钮
  canTop.value = scrollTop.value > 500;
  // 没超过500，但是到底部了，也显示回到顶部按钮
  if (!canTop.value) {
    const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
    const clientHeight = document.documentElement.clientHeight || document.body.clientHeight;
    canTop.value = scrollHeight - clientHeight - scrollTop.value <= 0;
  }
}

// 点击回到顶部
function handleScrollTop () {
  let timer = 0;
  cancelAnimationFrame(timer);
  timer = requestAnimationFrame(function fn () {
    if (scrollTop.value > 0) {
      scrollTop.value -= 50;
      document.body.scrollTop = document.documentElement.scrollTop = scrollTop.value;
      timer = requestAnimationFrame(fn);
    } else {
      cancelAnimationFrame(timer);
      canTop.value = false;
    }
  });
}

// 监听滚动事件
// @ts-ignore
onMounted(() => {
  window.addEventListener("scroll", handleScroll);
});
</script>

<style scoped>
.back-top {
  position: fixed;
  right: 0.4rem;
  bottom: 1rem;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  transition: all 0.3s ease-in-out;
}

.back-top :hover {
  border-radius: 50%;
  cursor: pointer;
  transform: scale(0.9);
  transition: all 0.3s ease-in-out;
  box-shadow: 0 0 10px 5px var(--back-top-shadow);
}

.back-top img {
  transition: all 0.3s ease-in-out;
  width: 60px;
  height: 60px;
}

/* 动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s;
}

.fade-enter,
.fade-leave-to {
  opacity: 0;
}
</style>
