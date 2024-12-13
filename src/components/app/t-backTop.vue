<template>
  <transition name="fade">
    <div v-show="canTop" class="back-top" @click="handleScrollTop">
      <img src="@/assets/icons/back-top.svg" alt="back-icon" />
    </div>
  </transition>
</template>
<script lang="ts" setup>
import { onMounted, onUnmounted, ref } from "vue";

const scrollTop = ref<number>(0);
const canTop = ref<boolean>(false);

function handleScroll(): void {
  scrollTop.value = document.documentElement.scrollTop || document.body.scrollTop;
  canTop.value = scrollTop.value > 500;
  if (!canTop.value) {
    const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
    const clientHeight = document.documentElement.clientHeight || document.body.clientHeight;
    canTop.value = scrollHeight - clientHeight - scrollTop.value <= 0;
  }
}

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

onMounted(() => window.addEventListener("scroll", handleScroll));
onUnmounted(() => window.removeEventListener("scroll", handleScroll));
</script>
<style lang="css" scoped>
.back-top {
  position: fixed;
  right: 10px;
  bottom: 10px;
  width: 40px;
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
