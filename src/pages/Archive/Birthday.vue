<template>
  <div class="ab-container">
    <div class="ab-draw-top">
      <v-switch v-model="isLumine" :label="isLumine ? '荧' : '空'" />
    </div>
    <div class="ab-draw-grid">
      <div v-for="item in selectedItem" :key="item.op_id" class="ab-draw-item">
        <v-img
          :src="item.take_picture[isLumine ? 0 : 1]"
          :lazy-src="item.unread_picture[isLumine ? 0 : 1]"
        />
        <span>{{ item.year }} {{ item.birthday }} {{ item.role_name }}</span>
      </div>
    </div>
    <v-pagination v-model="page" :length="length" />
  </div>
</template>
<script lang="ts" setup>
import { onMounted, ref, watch, watchEffect } from "vue";

import { ArcBirDraw } from "../../data";

const page = ref(1);
const length = ref(0);
const selectedItem = ref<TGApp.Archive.Birth.DrawItem[]>(ArcBirDraw);
const isLumine = ref<boolean>(true);

watch(page, (val) => {
  const start = (val - 1) * 12;
  const end = start + 12;
  selectedItem.value = ArcBirDraw.slice(start, end);
});

watchEffect(() => {
  selectedItem.value = ArcBirDraw.slice(0, 12);
});

onMounted(() => {
  length.value = Math.ceil(ArcBirDraw.length / 12);
});
</script>
<style lang="css" scoped>
.ab-container {
  display: flex;
  height: 100%;
  flex-direction: column;
  align-items: center;
  padding: 20px;
}

.ab-draw-top {
  display: flex;
  align-items: center;
  justify-content: center;
}

.ab-draw-grid {
  position: relative;
  display: grid;
  width: 100%;
  height: 100%;
  column-gap: 10px;
  grid-template-columns: repeat(4, 1fr);
}

.ab-draw-item {
  text-align: center;
}
</style>
