<template>
  <div class="tua-al-container">
    <div v-if="ncData !== undefined">
      <TopNameCard :data="ncData" @selected="showNc = true" :finish="isFinish" />
    </div>
    <v-virtual-scroll :items="renderAchi" :item-height="60" class="tua-al-list">
      <template #default="{ item }">
        <TuaAchi :modelValue="item" @select-achi="selectAchi" />
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
        <div class="card-arrow" @click="switchAchiInfo(false)">
          <img src="@/assets/icons/arrow-right.svg" alt="right" />
        </div>
      </template>
      <template #right>
        <div class="card-arrow" @click="switchAchiInfo(true)">
          <img src="@/assets/icons/arrow-right.svg" alt="right" />
        </div>
      </template>
    </ToAchiInfo>
  </div>
</template>
<script lang="ts" setup>
import ToNameCard from "@comp/app/to-nameCard.vue";
import TopNameCard from "@comp/app/top-nameCard.vue";
import showSnackbar from "@comp/func/snackbar.js";
import TSUserAchi from "@Sqlite/modules/userAchi.js";
import { computed, onMounted, ref, shallowRef, watch } from "vue";

import ToAchiInfo from "./tua-achi-overlay.vue";
import TuaAchi from "./tua-achi.vue";

import { AppAchievementSeriesData, AppNameCardsData } from "@/data/index.js";

type TuaAchiListProps = {
  uid: number;
  hideFin: boolean;
  series?: number;
  search?: string;
  isSearch: boolean;
};
type TuaAchiListEmits = {
  (e: "update:series", v: number): void;
  (e: "update:isSearch", v: boolean): false;
};

const props = defineProps<TuaAchiListProps>();
const emits = defineEmits<TuaAchiListEmits>();
const nameCard = ref<string>();
const showNc = ref<boolean>(false);
const showOverlay = ref<boolean>(false);
const isFinish = ref<boolean>(false);
const ncData = shallowRef<TGApp.App.NameCard.Item>();
const achievements = shallowRef<Array<TGApp.Sqlite.Achievement.RenderAchi>>([]);
const selectedAchi = shallowRef<TGApp.Sqlite.Achievement.RenderAchi>();
const renderAchi = computed<Array<TGApp.Sqlite.Achievement.RenderAchi>>(() => {
  if (props.hideFin) return achievements.value.filter((a) => !a.isCompleted);
  return achievements.value;
});

onMounted(async () => await loadAchi());

watch(() => [props.search, props.isSearch], searchAchi);
watch(() => [props.series, props.uid], loadAchi);

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
    emits("update:series", -1);
  }
  emits("update:isSearch", false);
}

async function loadAchi(): Promise<void> {
  if (props.isSearch) return;
  achievements.value = await TSUserAchi.getAchievements(props.uid, props.series);
  const ov = await TSUserAchi.getOverview(props.uid, props.series);
  isFinish.value = ov.fin === ov.total;
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
  height: fit-content;
  max-height: 100%;
  flex-direction: column;
  overflow-y: auto;
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

  img {
    width: 100%;
    height: 100%;
  }

  &:first-child {
    transform: rotate(180deg);
  }
}

.dark .card-arrow {
  filter: invert(11%) sepia(73%) saturate(11%) hue-rotate(139deg) brightness(97%) contrast(81%);
}

.unfinish {
  filter: grayscale(1);
}
</style>
