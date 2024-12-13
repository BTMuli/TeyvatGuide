<template>
  <div class="ab-container">
    <div class="ab-draw-top">
      <div @click="toAct" class="ab-draw-act" title="前往网页活动">
        <img src="/source/UI/act_birthday.png" alt="archive_birthday_icon" class="side-icon" />
      </div>
      <v-switch class="ab-draw-switch" v-model="isAether" />
      <span>{{ isAether ? "空" : "荧" }}</span>
      <v-select
        v-model="curSelect"
        class="ab-select"
        :items="ArcBirRole"
        clearable
        variant="outlined"
        label="角色"
        :item-value="(item: TGApp.Archive.Birth.RoleItem) => item"
        :item-props="(item: TGApp.Archive.Birth.RoleItem) => getItemProps(item)"
      />
    </div>
    <div class="ab-draw-grid">
      <div v-for="item in selectedItem" :key="item.op_id" class="ab-draw">
        <div class="ab-draw-cover" @click="showImg(item)">
          <img :src="item.unread_picture[Number(isAether)]" :alt="item.word_text" />
          <div class="ab-draw-hide" />
          <v-icon class="ab-draw-icon">mdi-magnify</v-icon>
        </div>
        <div class="ab-di-info">{{ item.year }} {{ item.birthday }} {{ item.role_name }}</div>
        <div class="ab-di-text" :title="item.word_text">{{ item.word_text }}</div>
      </div>
    </div>
    <v-pagination v-model="page" :length="length" :total-visible="visible" />
  </div>
  <ToArcBrith v-model="showOverlay" :data="current" :choice="isAether" />
</template>
<script lang="ts" setup>
import ToArcBrith from "@comp/pageArchive/to-arcBrith.vue";
import { computed, onMounted, ref, shallowRef, watch } from "vue";
import { useRoute } from "vue-router";

import { ArcBirDraw, ArcBirRole } from "@/data/index.js";
import TGClient from "@/utils/TGClient.js";

const route = useRoute();

const page = ref<number>(1);
const length = ref<number>(0);
const visible = ref<number>(0);
const isAether = ref<boolean>(false);
const showOverlay = ref<boolean>(false);
const renderItems = shallowRef<Array<TGApp.Archive.Birth.DrawItem>>([]);
const curSelect = shallowRef<TGApp.Archive.Birth.RoleItem | null>(null);
const current = shallowRef<TGApp.Archive.Birth.DrawItem>();
const selectedItem = computed<Array<TGApp.Archive.Birth.DrawItem>>(() =>
  renderItems.value.slice((page.value - 1) * 12, page.value * 12),
);

onMounted(() => {
  const { date } = route.params;
  if (date) {
    const dataFind = ArcBirRole.find((i) => i.role_birthday === date);
    if (dataFind) curSelect.value = dataFind;
  } else renderItems.value = ArcBirDraw;
  length.value = Math.ceil(renderItems.value.length / 12);
  visible.value = length.value > 5 ? 5 : length.value;
  page.value = 1;
});

watch(
  () => curSelect.value,
  () => {
    if (curSelect.value) {
      renderItems.value = ArcBirDraw.filter(
        (item) => item.birthday === curSelect.value?.role_birthday,
      );
    } else renderItems.value = ArcBirDraw;
    length.value = Math.ceil(renderItems.value.length / 12);
    page.value = 1;
    visible.value = length.value > 5 ? 5 : length.value;
  },
);

function showImg(item: TGApp.Archive.Birth.DrawItem): void {
  current.value = item;
  showOverlay.value = true;
}

async function toAct(): Promise<void> {
  await TGClient.open("birthday");
}

function getItemProps(item: TGApp.Archive.Birth.RoleItem) {
  return {
    title: `${item.name} ${item.role_birthday}`,
    subtitle: new DOMParser().parseFromString(item.text, "text/html").body.textContent,
    prependAvatar: item.head_icon,
  };
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
  width: 100%;
  height: 60px;
  align-items: center;
  justify-content: flex-start;
  column-gap: 10px;
}

.ab-draw-act {
  cursor: pointer;
}

.ab-draw-act img {
  width: 40px;
  height: 40px;
  object-fit: cover;
  object-position: center;
  transition: all 0.3s ease-in-out;
}

.ab-draw-switch {
  display: flex;
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
  height: fit-content;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  transition: all 0.3s ease-in-out;
}

.ab-draw-cover {
  position: relative;
  overflow: hidden;
  width: 100%;
  max-width: 100%;
  border-radius: 5px;
  aspect-ratio: 125 / 54;
}

.ab-draw-hide {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 5px;
  -webkit-backdrop-filter: blur(5px);
  backdrop-filter: blur(5px);
  background: var(--common-shadow-t-2);
}

.ab-draw-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  color: var(--common-shadow-8);
  font-size: 30px;
  transform: translate(-50%, -50%);
  transition: all 0.5s ease-in-out;
}

.ab-draw-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  transition: all 0.3s ease-in-out;
}

.ab-draw-act img:hover {
  transform: scale(1.1);
  transition: all 0.3s ease-in-out;
}

.ab-draw:hover img {
  overflow: hidden;
  cursor: pointer;
  transform: scale(1.1);
  transition: all 0.3s ease-in-out;
}

.ab-draw:hover .ab-draw-hide {
  -webkit-backdrop-filter: blur(0);
  backdrop-filter: blur(0);
  background: var(--common-shadow-2);
  cursor: pointer;
  transition: all 0.3s ease-in-out;
}

.ab-draw:hover .ab-draw-icon {
  color: var(--common-shadow-t-4);
  cursor: pointer;
  scale: 2;
  transition: all 0.5s ease-in-out;
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
