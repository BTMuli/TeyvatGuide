<template>
  <transition name="fade">
    <div v-show="canTop" class="back-top" @click="handleScrollTop">
      <img src="../../assets/icons/back-top.svg" alt="back-icon" />
    </div>
  </transition>
</template>
<script lang="ts" setup>
import { ref, onMounted, onUnmounted } from "vue";

const scrollTop = ref(0); // 滚动条距离顶部的距离
const canTop = ref(false); // 默认不显示

// 监听滚动事件
function handleScroll(): void {
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
function handleScrollTop(): void {
  let timer = 0;
  cancelAnimationFrame(timer);
  timer = requestAnimationFrame(function fn() {
    if (scrollTop.value > 0) {
      scrollTop.value -= 100;
      document.body.scrollTop = document.documentElement.scrollTop = scrollTop.value;
      timer = requestAnimationFrame(fn);
    } else {
      cancelAnimationFrame(timer);
      canTop.value = false;
    }
  });
}

// 监听滚动事件
onMounted(() => {
  window.addEventListener("scroll", handleScroll);
});

// 销毁监听
onUnmounted(() => {
  window.removeEventListener("scroll", handleScroll);
});
</script>

<style scoped>
.back-top {
  position: fixed;
  right: 10px;
  bottom: 10px;
  height: 40px;
  border-radius: 50%;
  transition: all 0.3s ease-in-out;
}

.back-top:hover {
  border-radius: 50%;
  cursor: pointer;
  transform: scale(1.2);
  transition: all 0.3s ease-in-out;
}

.back-top img {
  width: 100%;
  height: 100%;
  transition: all 0.3s ease-in-out;
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
