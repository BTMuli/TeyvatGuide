<template>
  <!-- 顶部操作栏 -->
  <v-app-bar style="background: rgb(0 0 0 / 50%); color: #f4d8a8; font-family: Genshin, serif">
    <template #prepend>
      <span style="font-size: 30px">{{ title }}</span>
    </template>
    <v-spacer />
    <v-text-field
      v-model="search"
      append-icon="mdi-magnify"
      label="搜索"
      hide-details
      @click:append="searchCard"
      @keyup.enter="searchCard"
    />
    <template #append>
      <v-btn prepend-icon="mdi-import" class="ms-2 top-btn" @click="importJson"> 导入 </v-btn>
      <v-btn prepend-icon="mdi-export" class="ms-2 top-btn" @click="exportJson"> 导出 </v-btn>
    </template>
  </v-app-bar>
  <ToLoading v-model="loading" :title="loadingTitle" />
  <div class="wrap">
    <!-- 左侧菜单 -->
    <div class="left-wrap">
      <v-list
        v-for="series in seriesList"
        :key="series.id"
        class="card-left"
        @click="selectSeries(series.id)"
      >
        <div class="version-icon-series">v{{ series.version }}</div>
        <v-list-item>
          <template #prepend>
            <v-img width="40px" style="margin-right: 10px" :src="getIcon(series.id)" />
          </template>
          <v-list-item-title>
            {{ series.name }}
          </v-list-item-title>
          <v-list-item-subtitle>
            {{ series.finCount }} / {{ series.totalCount }}
          </v-list-item-subtitle>
        </v-list-item>
      </v-list>
    </div>
    <!-- 右侧内容-->
    <div class="right-wrap" @scroll="handleScroll">
      <v-list
        v-if="selectedSeries !== 0 && selectedSeries !== 17 && selectedSeries !== -1 && !loading"
        :style="{
          backgroundImage: 'url(' + getCardImg.bg || null + ')',
          backgroundPosition: 'right',
          backgroundSize: 'auto 100%',
          backgroundRepeat: 'no-repeat',
          margin: '10px',
          borderRadius: '10px 50px 50px 10px',
          color: '#485466',
          fontFamily: 'Genshin,serif',
          cursor: 'pointer',
          position: 'relative',
        }"
        @click="openImg()"
      >
        <v-list-item :title="getCardInfo.name" :subtitle="getCardInfo.desc">
          <template #prepend>
            <v-img width="80px" style="margin-right: 10px" :src="getCardImg.icon" />
          </template>
        </v-list-item>
      </v-list>
      <div class="list-empty" :style="{ height: `${emptyHeight}px` }">
        <v-list
          v-for="achievement in renderAchievement"
          :key="achievement.id"
          class="card-right"
          :style="{ Transform: `translateY(${translateY})` }"
        >
          <div v-if="achievement.progress !== 0" class="achievement-progress">
            {{ achievement.progress }}
          </div>
          <v-list-item>
            <template #prepend>
              <v-icon :color="achievement.isCompleted ? '#fec90b' : '#485466'">
                <!-- todo 图标替换 -->
                {{ achievement.isCompleted ? "mdi-check-circle" : "mdi-circle" }}
              </v-icon>
            </template>
            <v-list-item-title>
              {{ achievement.name }}
              <span class="version-icon-single">v{{ achievement.version }}</span>
            </v-list-item-title>
            <v-list-item-subtitle>{{ achievement.description }}</v-list-item-subtitle>
            <template #append>
              <span v-show="achievement.isCompleted" class="right-time">{{
                achievement.completedTime
              }}</span>
              <v-card class="reward-card">
                <v-img src="/icon/material/201.webp" sizes="32" />
                <div class="reward-num">
                  <span>{{ achievement.reward }}</span>
                </div>
              </v-card>
            </template>
          </v-list-item>
        </v-list>
      </div>
    </div>
    <!-- 弹窗提示 -->
    <v-snackbar v-model="snackbar" timeout="1500" :color="snackbarColor" top>
      {{ snackbarText }}
    </v-snackbar>
  </div>
</template>

<script lang="ts" setup>
// vue
import { onMounted, ref, onBeforeMount, computed } from "vue";
import ToLoading from "../../components/overlay/to-loading.vue";
// tauri
import { dialog, fs } from "@tauri-apps/api";
// Store
import { useAchievementsStore } from "../../store/modules/achievements";
// Utils
import { createTGWindow } from "../../utils/TGWindow";
import { getUiafHeader, readUiafData, verifyUiafData } from "../../utils/UIAF";
import TGSqlite from "../../plugins/Sqlite";
import { AppAchievementSeriesData } from "../../data";

// Store
const achievementsStore = useAchievementsStore();

// loading
const loading = ref<boolean>(true);
const loadingTitle = ref<string>("正在加载数据");

// data
const title = ref(achievementsStore.title);
const getCardInfo = ref<TGApp.Sqlite.NameCard.SingleTable>(<TGApp.Sqlite.NameCard.SingleTable>{});
const getCardImg = computed(() => {
  return {
    profile: `/source/nameCard/profile/${getCardInfo.value.name}.webp`,
    bg: `/source/nameCard/bg/${getCardInfo.value.name}.webp`,
    icon: `/source/nameCard/icon/${getCardInfo.value.name}.webp`,
  };
});
// series
const seriesList = ref<TGApp.Sqlite.Achievement.SeriesTable[]>([]);
const selectedSeries = ref<number>(-1);
const selectedAchievement = ref<TGApp.Sqlite.Achievement.SingleTable[]>([]);
const renderAchievement = computed(() => {
  return selectedAchievement.value.slice(start.value, start.value + itemCount.value + 1);
});
// virtual list
const start = ref<number>(0);
const itemCount = computed(() => {
  return Math.ceil((window.innerHeight - 100) / 76);
});
const emptyHeight = computed(() => {
  return selectedAchievement.value.length * 76;
});
const translateY = ref<string>("0px");
// render
const search = ref<string>("");
const snackbar = ref<boolean>(false);
const snackbarText = ref<string>("");
const snackbarColor = ref<string>("#F5810A");

onBeforeMount(async () => {
  const { total, fin } = await TGSqlite.getAchievementsOverview();
  achievementsStore.flushData(total, fin);
  title.value = achievementsStore.title;
});

onMounted(async () => {
  loading.value = true;
  loadingTitle.value = "正在获取成就系列数据";
  seriesList.value = await TGSqlite.getAchievementSeries();
  loadingTitle.value = "正在获取成就数据";
  selectedAchievement.value = await TGSqlite.getAchievements();
  loading.value = false;
});

function handleScroll(e: Event): void {
  const target: HTMLElement = <HTMLElement>e.target;
  // 如果 scrollTop 到底部了
  if (target.scrollTop + target.offsetHeight >= target.scrollHeight) {
    // 如果 selectedAchievement 的长度小于 itemCount，不进行偏移
    if (selectedAchievement.value.length <= itemCount.value) {
      window.requestAnimationFrame(() => {
        start.value = 0;
        translateY.value = "0px";
      });
      return;
    }
    window.requestAnimationFrame(() => {
      start.value = selectedAchievement.value.length - itemCount.value;
      translateY.value = `${(selectedAchievement.value.length - itemCount.value) * 76}px`;
    });
    return;
  }
  const scrollTop = target.scrollTop;
  if (selectedSeries.value !== 0 && selectedSeries.value !== 17 && selectedSeries.value !== -1) {
    window.requestAnimationFrame(() => {
      if (scrollTop < 86.8) {
        start.value = 0;
        translateY.value = "0px";
      } else {
        start.value = Math.floor((scrollTop - 86.8) / 76);
        translateY.value = `${scrollTop - 86.8}px`;
      }
    });
  } else {
    window.requestAnimationFrame(() => {
      start.value = Math.floor(scrollTop / 76);
      translateY.value = `${scrollTop}px`;
    });
  }
}

// 渲染选中的成就系列
async function selectSeries(index: number): Promise<void> {
  // 如果选中的是已经选中的系列，则不进行操作
  if (selectedSeries.value === index) {
    snackbarText.value = "已经选中该系列";
    snackbar.value = true;
    return;
  }
  loading.value = true;
  loadingTitle.value = "正在获取对应的成就数据";
  selectedSeries.value = index;
  selectedAchievement.value = await TGSqlite.getAchievements(index);
  loadingTitle.value = "正在查找对应的成就名片";
  if (selectedSeries.value !== 0 && selectedSeries.value !== 17) {
    getCardInfo.value = await TGSqlite.getNameCard(index);
  }
  loading.value = false;
}

// 打开图片
function openImg(): void {
  createTGWindow(getCardImg.value.profile, "nameCard", getCardInfo.value.name, 840, 400, false);
}

async function searchCard(): Promise<void> {
  if (search.value === "") {
    snackbarColor.value = "#F5810A";
    snackbarText.value = "请输入搜索内容";
    snackbar.value = true;
    return;
  }
  selectedSeries.value = -1;
  loadingTitle.value = "正在搜索";
  loading.value = true;
  selectedAchievement.value = await TGSqlite.searchAchievements(search.value);
  if (selectedAchievement.value.length === 0) {
    snackbarColor.value = "#F5810A";
    snackbarText.value = "没有找到对应的成就";
    snackbar.value = true;
  }
  loading.value = false;
}
// 导入 UIAF 数据，进行数据合并、刷新
async function importJson(): Promise<void> {
  const selectedFile = await dialog.open({
    multiple: false,
    filters: [
      {
        name: "JSON",
        extensions: ["json"],
      },
    ],
  });
  if (selectedFile && (await verifyUiafData(<string>selectedFile))) {
    const remoteRaw: string | false = await readUiafData(<string>selectedFile);
    if (remoteRaw === false) {
      snackbarText.value = "读取 UIAF 数据失败，请检查文件是否符合规范";
      snackbar.value = true;
      return;
    }
    loadingTitle.value = "正在解析数据";
    loading.value = true;
    loadingTitle.value = "正在合并成就数据";
    await TGSqlite.mergeUIAF(JSON.parse(remoteRaw).list);
    loadingTitle.value = "即将刷新页面";
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }
}

// 导出
async function exportJson(): Promise<void> {
  // 判断是否有数据
  if (achievementsStore.finAchievements === 0) {
    snackbarColor.value = "#F5810A";
    snackbarText.value = "没有可导出的数据";
    snackbar.value = true;
    return;
  }
  // 获取本地数据
  const UiafData = {
    info: await getUiafHeader(),
    list: await TGSqlite.getUIAF(),
  };
  const isSave = await dialog.save({
    // TODO: 设置保存文件名
    filters: [
      {
        name: "uiaf",
        extensions: ["json"],
      },
    ],
  });
  if (isSave) {
    await fs.writeTextFile(isSave, JSON.stringify(UiafData));
    snackbarColor.value = "#00BFA5";
    snackbarText.value = "导出成功";
    snackbar.value = true;
  } else {
    snackbarColor.value = "#F5810A";
    snackbarText.value = "导出已取消";
    snackbar.value = true;
  }
}

function getIcon(series: number): string {
  return AppAchievementSeriesData.find((item) => item.id === series)?.icon;
}
</script>

<style lang="css" scoped>
/* 顶部按钮 */
.top-btn {
  background: #393b40;
  color: #faf7e8 !important;
}

/* 内容区域 */
.wrap {
  display: flex;
  justify-content: space-between;
}

/* 左侧系列 */
.left-wrap {
  width: 400px;
  height: calc(100vh - 100px);
  overflow-x: hidden;
  overflow-y: scroll;
}

/* 右侧成就 */
.right-wrap {
  width: calc(100% - 410px);
  height: calc(100vh - 100px);
  overflow-x: hidden;
  overflow-y: scroll;
}

.list-empty {
  position: relative;
  width: 100%;
}

/* 版本信息 */
.version-icon-series {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 80px;
  border-radius: 10px 0 0;
  border-top: #fff 2px solid;
  border-left: #fff 2px solid;
  background: #546d8b;
  color: #fec90b;
  font-family: Genshin, serif;
  font-size: 10px;
  text-align: center;
}

.version-icon-single {
  border-radius: 5px;
  color: #ff6d6d;
  font-family: Genshin, serif;
  font-size: 10px;
  text-align: center;
}

.card-left {
  border-radius: 10px;
  margin: 10px;
  background: #485466;
  color: #fec90b;
  cursor: pointer;
}

/* 成就卡片 */
.card-right {
  border-radius: 10px;
  margin: 10px;
  background: #546d8b;
  color: #faf7e8;
}

/* 成就进度 */
.achievement-progress {
  position: absolute;
  top: 0;
  left: 0;
  width: 65px;
  border-right: #fff 2px solid;
  border-bottom: #fff 2px solid;
  background: #8ba5c5;
  border-bottom-right-radius: 20px;
  color: #485466;
  font-family: Genshin, serif;
  font-size: 10px;
  text-align: center;
}

/* 成就完成时间 */
.right-time {
  margin-right: 10px;
  color: #faf7e8;
  font-size: small;
}

/* 成就奖励 */
.reward-card {
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: 5px;
  background-image: url("/icon/bg/5-Star.webp");
  background-size: cover;
}

.reward-num {
  position: absolute;
  bottom: 0;
  left: 0;
  display: flex;
  width: 100%;
  height: 10px;
  align-items: center;
  justify-content: center;
  background: rgb(0 0 0 / 50%);
  color: #faf7e8;
  font-size: 8px;
}
</style>
