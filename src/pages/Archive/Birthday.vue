<template>
  <div class="ab-container">
    <div class="ab-draw-top">
      <v-switch v-model="isAether" :label="isAether ? '空' : '荧'" />
    </div>
    <div class="ab-draw-grid">
      <div v-for="item in selectedItem" :key="item.op_id" class="ab-draw">
        <div class="ab-draw-cover" @click="showImg(item)">
          <img
            :src="item.take_picture[Number(isAether)]"
            :data-src="item.unread_picture[Number(isAether)]"
            :alt="item.word_text"
          />
        </div>
        <div class="ab-di-info">{{ item.year }} {{ item.birthday }} {{ item.role_name }}</div>
        <div class="ab-di-text" :title="item.word_text">{{ item.word_text }}</div>
      </div>
    </div>
    <v-pagination v-model="page" :length="length" />
  </div>
  <ToArcBrith v-model="showOverlay" :data="current" :choice="isAether" />
</template>
<script lang="ts" setup>
import { onMounted, ref, watch, watchEffect } from "vue";

import ToArcBrith from "../../components/overlay/to-arcBrith.vue";
import { ArcBirDraw } from "../../data";

const page = ref(1);
const length = ref(0);
const selectedItem = ref<TGApp.Archive.Birth.DrawItem[]>(ArcBirDraw);
const current = ref<TGApp.Archive.Birth.DrawItem>();
const isAether = ref<boolean>(false);
const showOverlay = ref(false);

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

function showImg(item: TGApp.Archive.Birth.DrawItem) {
  current.value = item;
  showOverlay.value = true;
}
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
  gap: 10px;
  grid-template-columns: repeat(4, 1fr);
}

.ab-draw {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
}

.ab-draw-cover {
  overflow: hidden;
  width: 100%;
  max-width: 100%;
  border-radius: 5px;
  aspect-ratio: 125 / 54;
}

.ab-draw-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  transition: all 0.3s ease-in-out;
}

.ab-draw-cover img:hover {
  overflow: hidden;
  cursor: pointer;
  transform: scale(1.1);
  transition: all 0.3s ease-in-out;
}

.ab-di-info {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
}

.ab-di-text {
  width: fit-content;
  max-width: 100%;
  margin-right: auto;
  margin-left: auto;
  font-size: 14px;
  line-height: 1.5;
  opacity: 0.8;
}
</style>
