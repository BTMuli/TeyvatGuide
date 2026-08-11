<!-- 留影叙佳期 -->
<template>
  <v-app-bar>
    <div class="ab-top">
      <div class="ab-title">
        <img alt="archive_birthday_icon" src="/UI/nav/act_birthday.webp" />
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
          v-model="curPage"
          :length="pageNum"
          :total-visible="visible"
          density="compact"
          variant="elevated"
        />
      </div>
    </template>
  </v-app-bar>
  <div class="ab-grid-container">
    <PacBirthCard
      v-for="item in renderItems"
      :key="item.op_id"
      :isAether
      :item
      @open="showImg(item)"
    />
  </div>
  <ToArcBrith v-model="showOverlay" :choice="isAether" :data="current">
    <template #left>
      <v-btn
        aria-label="上一张留影"
        class="card-arrow"
        icon="mdi-chevron-left"
        title="上一张留影"
        variant="flat"
        @click="switchCard(false)"
      />
    </template>
    <template #right>
      <v-btn
        aria-label="下一张留影"
        class="card-arrow"
        icon="mdi-chevron-right"
        title="下一张留影"
        variant="flat"
        @click="switchCard(true)"
      />
    </template>
  </ToArcBrith>
</template>
<script lang="ts" setup>
import showSnackbar from "@comp/func/snackbar.js";
import PacBirthCard from "@comp/pageArchive/pac-birth-card.vue";
import ToArcBrith from "@comp/pageArchive/pao-birth-card.vue";
import { computed, nextTick, onMounted, ref, shallowRef, watch } from "vue";
import { useRoute } from "vue-router";

import { ArcBirDraw, ArcBirRole } from "@/data/index.js";

const route = useRoute();

const curPage = ref<number>(1);
const pageNum = ref<number>(0);
const visible = ref<number>(0);
const isAether = ref<boolean>(false);
const showOverlay = ref<boolean>(false);
const curIndex = ref<number>(0);
const selectedItems = shallowRef<Array<TGApp.Archive.Birth.DrawItem>>([]);
const curSelect = shallowRef<TGApp.Archive.Birth.RoleItem | null>(null);
const current = shallowRef<TGApp.Archive.Birth.DrawItem>();
const renderItems = computed<Array<TGApp.Archive.Birth.DrawItem>>(() =>
  selectedItems.value.slice((curPage.value - 1) * 12, curPage.value * 12),
);

onMounted(() => {
  const { date } = route.params;
  if (date) {
    const dataFind = ArcBirRole.find((i) => i.role_birthday === date);
    if (dataFind) curSelect.value = dataFind;
  } else selectedItems.value = ArcBirDraw;
  pageNum.value = Math.ceil(selectedItems.value.length / 12);
  visible.value = pageNum.value > 5 ? 5 : pageNum.value;
  curPage.value = 1;
});

watch(
  () => curSelect.value,
  async () => {
    if (curSelect.value) {
      selectedItems.value = ArcBirDraw.filter(
        (item) => item.birthday === curSelect.value?.role_birthday,
      );
    } else selectedItems.value = ArcBirDraw;
    pageNum.value = Math.ceil(selectedItems.value.length / 12);
    curPage.value = 1;
    curIndex.value = 0;
    current.value = renderItems.value[0];
    await nextTick();
    visible.value = pageNum.value > 5 ? 5 : pageNum.value;
  },
);

watch(
  () => curPage.value,
  (newPage, oldPage) => {
    if (oldPage !== undefined && oldPage > newPage) {
      curIndex.value = renderItems.value.length - 1;
    } else curIndex.value = 0;
  },
);

function showImg(item: TGApp.Archive.Birth.DrawItem): void {
  current.value = item;
  curIndex.value = renderItems.value.findIndex((i) => i.op_id === item.op_id);
  showOverlay.value = true;
}

function getItemProps(item: TGApp.Archive.Birth.RoleItem) {
  return {
    title: `${item.name} ${item.role_birthday}`,
    prependAvatar: item.head_icon,
  };
}

async function switchCard(isNext: boolean): Promise<void> {
  if (isNext) {
    if (curIndex.value === renderItems.value.length - 1) {
      if (curPage.value >= pageNum.value) {
        showSnackbar.warn("已经是最后一张了");
        return;
      }
      curPage.value++;
    } else curIndex.value++;
  } else {
    if (curIndex.value === 0) {
      if (curPage.value <= 1) {
        showSnackbar.warn("已经是第一张了");
        return;
      }
      curPage.value--;
    } else curIndex.value--;
  }
  await nextTick();
  current.value = renderItems.value[curIndex.value];
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

.card-arrow {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border: 1px solid var(--common-shadow-2);
  border-radius: 8px;
  background: var(--box-bg-1);
  color: var(--box-text-2);
}
</style>
