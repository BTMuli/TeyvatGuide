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
// vue
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
  background: rgb(255 255 255 / 5%);
  box-shadow: 0 0 10px rgb(0 0 0 / 50%);
  border-radius: 15px;
}

.tol-box {
  width: 100%;
  padding: 10px;
  display: flex;
  box-sizing: content-box;
  border: #f4d8a8 1px solid;
  color: #f4d8a8;
  border-radius: 5px;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.tol-title {
  width: 100%;
  height: 50px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 2rem;
  font-family: Genshin, serif;
  font-weight: 600;
}

.tol-subtitle {
  width: 100%;
  text-align: center;
  font-size: 1rem;
  height: 25px;
  font-family: Genshin-Light, serif;
}

.tol-img {
  width: 100%;
  height: 200px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.tol-img:deep(img) {
  max-height: 200px;
  max-width: 100%;
  border-radius: 5px;
}
</style>
