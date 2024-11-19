<template>
  <div class="tua-al-container">
    <div v-if="ncData !== undefined">
      <TopNameCard :data="ncData" @selected="showNc = true" />
    </div>
    <v-virtual-scroll :items="renderAchi" :item-height="60" class="tua-al-list">
      <template #default="{ item }">
        <TuaAchi :modelValue="item" @select-achi="selectAchi" />
        <div style="height: 10px" />
      </template>
    </v-virtual-scroll>
    <ToNameCard v-model="showNc" :data="ncData" v-if="ncData" />
    <ToAchiInfo
      v-if="selectedAchi"
      v-model="showOverlay"
      :data="selectedAchi"
      @select-series="selectSeries"
    >
      <template #left>
        <div class="card-arrow left" @click="switchAchiInfo(false)">
          <img src="../../assets/icons/arrow-right.svg" alt="right" />
        </div>
      </template>
      <template #right>
        <div class="card-arrow" @click="switchAchiInfo(true)">
          <img src="../../assets/icons/arrow-right.svg" alt="right" />
        </div>
      </template>
    </ToAchiInfo>
  </div>
</template>
<script lang="ts" setup>
import { ref, computed, watch, onMounted } from "vue";

import { AppAchievementSeriesData, AppNameCardsData } from "../../data/index.js";
import TSUserAchi from "../../plugins/Sqlite/modules/userAchi.js";
import ToNameCard from "../app/to-namecard.vue";
import TopNameCard from "../app/top-namecard.vue";
import showSnackbar from "../func/snackbar.js";

import ToAchiInfo from "./tua-achi-overlay.vue";
import TuaAchi from "./tua-achi.vue";

interface TuaAchiListProps {
  uid: number;
  hideFin: boolean;
  series?: number;
  search?: string;
  isSearch: boolean;
}

interface TuaAchiListEmits {
  (e: "update:series", v: number): void;

  (e: "update:isSearch", v: boolean): false;
}

const props = defineProps<TuaAchiListProps>();
const emits = defineEmits<TuaAchiListEmits>();

const achievements = ref<TGApp.Sqlite.Achievement.RenderAchi[]>([]);
const selectedAchi = ref<TGApp.Sqlite.Achievement.RenderAchi | undefined>(undefined);

const nameCard = ref<string>();
const ncData = ref<TGApp.App.NameCard.Item | undefined>(undefined);
const showNc = ref<boolean>(false);

const showOverlay = ref<boolean>(false);

const renderAchi = computed<Array<TGApp.Sqlite.Achievement.RenderAchi>>(() => {
  if (props.hideFin) return achievements.value.filter((a) => !a.isCompleted);
  return achievements.value;
});

onMounted(async () => await loadAchi());

watch(
  () => [props.search, props.isSearch],
  async () => await searchAchi(),
);

watch(
  () => [props.series, props.uid],
  async () => await loadAchi(),
);

async function searchAchi(): Promise<void> {
  if (!props.isSearch) return;
  if (!props.search || props.search === "") {
    showSnackbar.warn("请输入搜索内容");
    emits("update:isSearch", false);
    return;
  }
  nameCard.value = undefined;
  ncData.value = undefined;
  achievements.value = await TSUserAchi.searchAchi(props.uid, props.search);
  if (achievements.value.length > 0) {
    showSnackbar.success(`成功获取${achievements.value.length}条成就`);
  }
  emits("update:isSearch", false);
}

async function loadAchi(): Promise<void> {
  achievements.value = await TSUserAchi.getAchievements(props.uid, props.series);
  if (!selectedAchi.value && achievements.value.length > 0) {
    selectedAchi.value = achievements.value[0];
  } else if (selectedAchi.value !== undefined && achievements.value.length > 0) {
    const index = achievements.value.findIndex((a) => a.id === selectedAchi.value!.id);
    if (index === -1) selectedAchi.value = achievements.value[0];
  }
  const seriesFind = AppAchievementSeriesData.find((s) => s.id === props.series);
  if (!seriesFind || seriesFind.card === "") {
    nameCard.value = undefined;
    ncData.value = undefined;
  } else nameCard.value = seriesFind.card;
  if (nameCard.value && nameCard.value !== "") {
    const ncFind = AppNameCardsData.find((c) => c.name === nameCard.value);
    if (ncFind) ncData.value = ncFind;
    else ncData.value = undefined;
  }
  showSnackbar.success(`已获取 ${achievements.value.length} 条成就数据`);
}

function selectAchi(data: TGApp.Sqlite.Achievement.RenderAchi): void {
  selectedAchi.value = data;
  showOverlay.value = true;
}

function selectSeries(data: number): void {
  emits("update:series", data);
}

function switchAchiInfo(next: boolean): void {
  if (selectedAchi.value === undefined) {
    showSnackbar.warn("当前未选中成就！");
    return;
  }
  const index = renderAchi.value.findIndex((i) => i === selectedAchi.value);
  if (index === -1) {
    showSnackbar.warn(
      `未找到选中成就 ${selectedAchi.value.name}(${selectedAchi.value.id}) 的索引！`,
    );
    return;
  }
  if (next) {
    if (index === renderAchi.value.length - 1) {
      showSnackbar.warn("已经是最后一个了");
      return;
    }
    selectedAchi.value = renderAchi.value[index + 1];
    return;
  }
  if (index === 0) {
    showSnackbar.warn("已经是第一个了");
    return;
  }
  selectedAchi.value = renderAchi.value[index - 1];
}
</script>
<style lang="css" scoped>
.tua-al-container {
  display: flex;
  width: 100%;
  height: 100%;
  flex-direction: column;
  overflow-y: auto;
  row-gap: 10px;
}

.tua-al-list {
  padding-right: 10px;
}

.card-arrow {
  position: relative;
  display: flex;
  width: 30px;
  height: 30px;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.dark .card-arrow {
  filter: invert(11%) sepia(73%) saturate(11%) hue-rotate(139deg) brightness(97%) contrast(81%);
}

.card-arrow img {
  width: 100%;
  height: 100%;
}

.card-arrow.left img {
  transform: rotate(180deg);
}
</style>
