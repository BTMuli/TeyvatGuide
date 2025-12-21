<!-- 留影叙佳期 -->
<template>
  <v-app-bar>
    <div class="ab-top">
      <div class="ab-title">
        <img alt="archive_birthday_icon" src="/source/UI/act_birthday.webp" @click="toAct()" />
        <span>留影叙佳期</span>
      </div>
      <div class="ab-switch">
        <span>{{ isAether ? "空" : "荧" }}</span>
        <v-switch
          v-model="isAether"
          class="ab-switch-btn"
          color="var(--tgc-od-orange)"
          density="compact"
        />
      </div>
      <v-select
        v-model="curSelect"
        :hide-details="true"
        :item-props="(item: TGApp.Archive.Birth.RoleItem) => getItemProps(item)"
        :item-value="(item: TGApp.Archive.Birth.RoleItem) => item"
        :items="ArcBirRole"
        class="ab-select"
        clearable
        density="compact"
        label="角色"
        variant="outlined"
      />
    </div>
    <template #append>
      <div class="ab-top-append">
        <v-pagination
          v-model="page"
          :length="length"
          :total-visible="visible"
          density="compact"
          variant="elevated"
        />
      </div>
    </template>
  </v-app-bar>
  <div class="ab-grid-container">
    <PacBirthCard
      v-for="item in selectedItem"
      :key="item.op_id"
      :isAether
      :item
      @open="showImg(item)"
    />
  </div>
  <!-- TODO: 左右SLOT -->
  <ToArcBrith v-model="showOverlay" :choice="isAether" :data="current" />
</template>
<script lang="ts" setup>
import PacBirthCard from "@comp/pageArchive/pac-birth-card.vue";
import ToArcBrith from "@comp/pageArchive/pao-birth-card.vue";
import TGClient from "@utils/TGClient.js";
import { computed, onMounted, ref, shallowRef, watch } from "vue";
import { useRoute } from "vue-router";

import { ArcBirDraw, ArcBirRole } from "@/data/index.js";

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
    prependAvatar: item.head_icon,
  };
}
</script>
<style lang="scss" scoped>
.ab-top {
  position: relative;
  display: flex;
  margin-left: 16px;
  column-gap: 24px;
}

.ab-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  img {
    width: 32px;
    height: 32px;
    cursor: pointer;
  }

  span {
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 20px;
  }
}

.ab-switch {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 12px;

  span {
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 20px;
  }

  .ab-switch-btn {
    position: relative;
    display: flex;
  }
}

.ab-select {
  position: relative;
  width: 360px;
}

.ab-top-append {
  position: relative;
  margin-right: 12px;
}

.ab-grid-container {
  position: relative;
  display: grid;
  width: 100%;
  height: 100%;
  gap: 8px;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(3, 1fr);
}
</style>
