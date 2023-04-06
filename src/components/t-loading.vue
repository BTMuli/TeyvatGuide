<template>
  <div class="loading-div">
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
</template>
<script lang="ts" setup>
interface LoadingProps {
  title?: string;
  subtitle?: string;
  content?: string;
  empty?: boolean;
  position?: string;
}

withDefaults(defineProps<LoadingProps>(), {
  title: "加载中",
  subtitle: "",
  content: "",
  empty: false,
  position: "absolute",
});
</script>
<style lang="css" scoped>
.loading-div {
  position: v-bind(position);
  display: flex;
  top: 25%;
  left: 25%;
  width: 50%;
  height: 50%;
  background: rgb(57 59 64 / 50%);
  backdrop-filter: blur(10px);
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
