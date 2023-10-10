<template>
  <TOverlay v-model="show" :blur-val="'5px'">
    <div class="tol-div">
      <div class="tol-box">
        <div class="tol-title">
          <slot name="title">
            {{ title }}
          </slot>
          <v-progress-circular v-show="!empty" indeterminate color="#f4d8a8" />
        </div>
        <div v-if="subtitle" class="tol-subtitle">
          <slot name="subtitle">
            {{ subtitle }}
          </slot>
        </div>
        <div class="tol-img">
          <slot name="img">
            <img v-if="!empty" src="/source/UI/loading.webp" alt="loading" />
            <img v-else src="/source/UI/empty.webp" alt="empty" />
          </slot>
        </div>
      </div>
    </div>
  </TOverlay>
</template>
<script lang="ts" setup>
import { ref, watch } from "vue";

import TOverlay from "../main/t-overlay.vue";

interface LoadingProps {
  modelValue: boolean;
  title?: string;
  subtitle?: string;
  empty?: boolean;
}

const show = ref(true);

const props = withDefaults(defineProps<LoadingProps>(), {
  modelValue: true,
  title: "加载中",
  subtitle: "",
  empty: false,
});

watch(
  () => props.modelValue,
  (v) => {
    show.value = v;
  },
);
</script>
<style lang="css" scoped>
.tol-div {
  display: flex;
  min-width: 800px;
  min-height: 300px;
  padding: 15px;
  border-radius: 15px;
  background: rgb(255 255 255 / 5%);
  box-shadow: 0 0 10px rgb(0 0 0 / 50%);
}

.tol-box {
  display: flex;
  width: 100%;
  box-sizing: content-box;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 10px;
  border: #f4d8a8 1px solid;
  border-radius: 5px;
  color: #f4d8a8;
}

.tol-title {
  display: flex;
  width: 100%;
  height: 50px;
  align-items: center;
  justify-content: center;
  font-family: Genshin, serif;
  font-size: 2rem;
  font-weight: 600;
}

.tol-subtitle {
  width: 100%;
  height: 25px;
  font-family: Genshin-Light, serif;
  font-size: 1rem;
  text-align: center;
}

.tol-img {
  display: flex;
  width: 100%;
  height: 200px;
  align-items: center;
  justify-content: center;
}

.tol-img:deep(img) {
  max-width: 100%;
  max-height: 200px;
  border-radius: 5px;
}
</style>
