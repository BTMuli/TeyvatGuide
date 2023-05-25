<template>
  <transition enter-from-class="out-enter-from" name="out">
    <div v-show="showOut" class="loading-box">
      <transition enter-from-class="in-enter-from" name="in">
        <div v-show="showIn" class="loading-div">
          <div class="loading-content">
            <div class="loading-title">
              {{ title }}
              <v-progress-circular v-show="!empty" indeterminate color="#f4d8a8" />
            </div>
            <div v-if="subtitle !== ''" class="loading-subtitle">
              {{ subtitle }}
            </div>
            <div v-if="!empty" class="loading-img">
              <img src="/source/UI/loading.webp" alt="loading">
            </div>
            <div v-else class="loading-img">
              <img src="/source/UI/empty.webp" alt="empty">
            </div>
            <div v-if="content !== ''" class="loading-text">
              {{ content }}
            </div>
          </div>
        </div>
      </transition>
    </div>
  </transition>
</template>
<script lang="ts" setup>
// vue
import { ref, watch } from "vue";

interface LoadingProps {
  modelValue: boolean;
  title?: string;
  subtitle?: string;
  content?: string;
  empty?: boolean;
}

const showOut = ref(false);
const showIn = ref(false);

const props = withDefaults(defineProps<LoadingProps>(), {
  modelValue: false,
  title: "加载中",
  subtitle: "",
  content: "",
  empty: false,
});

watch(
  () => props.modelValue,
  (v) => {
    if (v) {
      showOut.value = true;
      showIn.value = false;
    } else {
      setTimeout(() => {
        showIn.value = false;
      }, 100);
      setTimeout(() => {
        showOut.value = false;
      }, 300);
    }
  },
);

</script>
<style lang="css" scoped>
.out-enter-active,
.out-leave-active,
.in-enter-active {
  transition: all 0.3s;
}

.in-leave-active {
  transition: all 0.5s ease-in-out;
}

.out-enter-from,
.in-enter-from {
  opacity: 0;
  transform: scale(1.5);
}

.out-enter-to,
.in-enter-to {
  opacity: 1;
  transform: scale(1);
}

.out-leave-from {
  opacity: 1;
}

.out-leave-to {
  opacity: 0;
}

.in-leave-from {
  opacity: 1;
  transform: scale(1);
}

.in-leave-to {
  opacity: 0;
  transform: scale(0);
}

.loading-box {
  position: fixed;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgb(0 0 0 / 50%);
  backdrop-filter: blur(20px);
  z-index: 100;
}

.loading-div {
  display: flex;
  width: 50%;
  height: 50%;
  background: rgb(255 255 255 / 10%);
  box-shadow: 0 0 10px rgb(0 0 0 / 40%);
  border-radius: 20px;
}

.loading-content {
  width: 100%;
  margin: 20px;
  display: flex;
  border: #f4d8a8 1px solid;
  border-radius: 20px;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.loading-title {
  font-size: 2rem;
  font-family: Genshin, serif;
  font-weight: 600;
  color: #f4d8a8;
}

.loading-subtitle {
  font-size: 1rem;
  font-family: Genshin-Light, serif;
  color: #f4d8a8;
}

.loading-img {
  width: 256px;
  height: 256px;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
