<template>
  <div class="top-bar">
    <div class="top-title" @click="switchHideFin">{{ title }}</div>
    <v-text-field
      v-model="search"
      append-icon="mdi-magnify"
      label="搜索"
      hide-details
      variant="outlined"
      @click:append="searchCard"
      @keyup.enter="searchCard"
    />
    <div class="top-btns">
      <v-btn prepend-icon="mdi-import" class="top-btn" @click="importJson"> 导入</v-btn>
      <v-btn prepend-icon="mdi-export" class="top-btn" @click="exportJson"> 导出</v-btn>
    </div>
  </div>
  <ToLoading v-model="loading" :title="loadingTitle" />
  <div class="wrap">
    <!-- 左侧菜单 -->
    <div class="left-wrap">
      <div
        v-for="series in allSeriesData"
        :key="series.id"
        class="card-series"
        @click="selectSeries(series.id)"
      >
        <div class="series-version">v{{ series.version }}</div>
        <img alt="icon" class="series-icon" :src="getIcon(series.id)" />
        <div class="series-content">
          <span :title="series.name">
            {{ series.name }}
          </span>
          <span> {{ series.finCount }} / {{ series.totalCount }} </span>
        </div>
      </div>
    </div>
    <!-- 右侧内容-->
    <div class="right-wrap">
      <div
        v-if="selectedSeries !== 0 && selectedSeries !== 17 && selectedSeries !== -1 && !loading"
      >
        <v-list
          class="achi-series"
          :style="{ backgroundImage: `url(${curCard.bg})` }"
          @click="openImg()"
        >
          <v-list-item :title="curCard.name" :subtitle="curCard.desc">
            <template #prepend>
              <v-img width="80px" style="margin-right: 10px" :src="curCard.icon" />
            </template>
          </v-list-item>
        </v-list>
      </div>
      <div
        v-for="achievement in renderSelect"
        :key="achievement.id"
        class="card-achi"
        :title="allSeriesData.find((item) => item.id === achievement.series)?.name ?? ''"
      >
        <div v-if="achievement.progress !== 0" class="achi-progress">
          {{ achievement.progress }}
        </div>
        <div class="achi-pre">
          <div class="achi-pre-icon">
            <v-icon
              v-if="!achievement.isCompleted"
              color="var(--tgc-blue-3)"
              @click="setAchi(achievement, true)"
              style="cursor: pointer"
            >
              mdi-circle
            </v-icon>
            <v-icon
              v-else
              class="achievement-finish"
              style="cursor: pointer"
              @click="setAchi(achievement, false)"
            >
              <img alt="finish" src="/source/UI/finish.webp" />
            </v-icon>
          </div>
          <div class="achi-pre-info">
            <span
              >{{ achievement.name }}
              <span>v{{ achievement.version }}</span>
            </span>
            <span>{{ achievement.description }}</span>
          </div>
        </div>
        <div class="achi-append">
          <span v-show="achievement.isCompleted">
            {{ achievement.completedTime }}
          </span>
          <div class="achi-append-icon">
            <img alt="icon" src="/icon/material/201.webp" />
            <span>{{ achievement.reward }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { dialog, fs, path } from "@tauri-apps/api";
import { computed, nextTick, onBeforeMount, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import showConfirm from "../../components/func/confirm";
import showSnackbar from "../../components/func/snackbar";
import ToLoading from "../../components/overlay/to-loading.vue";
import { AppAchievementSeriesData } from "../../data";
import TGSqlite from "../../plugins/Sqlite";
import { useAchievementsStore } from "../../store/modules/achievements";
import { createTGWindow } from "../../utils/TGWindow";
import { getNowStr } from "../../utils/toolFunc";
import { getUiafHeader, readUiafData, verifyUiafData } from "../../utils/UIAF";

// Store
const achievementsStore = useAchievementsStore();

// loading
const loading = ref<boolean>(true);
const loadingTitle = ref<string>("正在加载数据");
const search = ref<string>("");
const hideFin = ref<boolean>(false);
// data
const title = ref(achievementsStore.title);
let curCard = reactive({ profile: "", bg: "", icon: "", name: "", desc: "" });
// series
const allSeriesData = ref<TGApp.Sqlite.Achievement.SeriesTable[]>([]);
const selectedSeries = ref<number>(-1);
const selectedAchievement = ref<TGApp.Sqlite.Achievement.SingleTable[]>([]);
const renderSelect = computed(() => {
  if (hideFin.value) {
    return selectedAchievement.value.filter((item) => item.isCompleted === 0);
  }
  return selectedAchievement.value;
});

// route
const route = useRoute();
const router = useRouter();

onBeforeMount(async () => {
  await flushOverview();
});

// 更改是否隐藏已完成
async function switchHideFin() {
  const text = hideFin.value ? "显示已完成" : "隐藏已完成";
  const res = await showConfirm({
    title: "是否切换显示已完成？",
    text,
  });
  if (res === false) {
    showSnackbar({
      color: "warn",
      text: "已取消切换",
    });
    return;
  }
  hideFin.value = !hideFin.value;
  showSnackbar({
    text: `已${text}`,
  });
}

// 刷新概况
async function flushOverview(): Promise<void> {
  const { total, fin } = await getAchiOverview();
  achievementsStore.flushData(total, fin);
  title.value = achievementsStore.title;
}

onMounted(async () => {
  loading.value = true;
  loadingTitle.value = "正在获取成就系列数据";
  allSeriesData.value = await getSeriesData();
  achievementsStore.lastVersion = await TGSqlite.getLatestAchievementVersion();
  loadingTitle.value = "正在获取成就数据";
  selectedAchievement.value = await getAchiData("all");
  loading.value = false;
  if (route.query.app && typeof route.query.app === "string") {
    await handleImportOuter(route.query.app);
  } else {
    // 等 500ms 动画
    setTimeout(() => {
      showSnackbar({
        text: `已获取 ${renderSelect.value.length} 条成就数据`,
      });
    }, 500);
  }
});

// 渲染选中的成就系列
async function selectSeries(index: number): Promise<void> {
  // 如果选中的是已经选中的系列，则不进行操作
  if (selectedSeries.value === index) {
    showSnackbar({
      color: "warn",
      text: "已经选中该系列",
    });
    return;
  }
  loading.value = true;
  loadingTitle.value = "正在获取对应的成就数据";
  selectedSeries.value = index;
  selectedAchievement.value = await getAchiData("series", index.toString());
  loadingTitle.value = "正在查找对应的成就名片";
  if (selectedSeries.value !== 0 && selectedSeries.value !== 17) {
    const cardGet = await TGSqlite.getNameCard(index);
    curCard = {
      profile: `/source/nameCard/profile/${cardGet.name}.webp`,
      bg: `/source/nameCard/bg/${cardGet.name}.webp`,
      icon: `/source/nameCard/icon/${cardGet.name}.webp`,
      name: cardGet.name,
      desc: cardGet.desc,
    };
  }
  // 右侧滚动到顶部
  const rightWrap = document.querySelector(".right-wrap");
  if (rightWrap) {
    rightWrap.scrollTop = 0;
  }
  await nextTick(() => {
    loading.value = false;
    // 等 500ms 动画
    setTimeout(() => {
      showSnackbar({
        text: `已获取 ${renderSelect.value.length} 条成就数据`,
      });
    }, 500);
  });
}

// 打开图片
function openImg(): void {
  createTGWindow(curCard.profile, "Sub_window", `Namecard_${curCard.name}`, 840, 400, false);
}

async function searchCard(): Promise<void> {
  if (search.value === "") {
    showSnackbar({
      color: "error",
      text: "请输入搜索内容",
    });
    return;
  }
  selectedSeries.value = -1;
  loadingTitle.value = "正在搜索";
  loading.value = true;
  selectedAchievement.value = await getAchiData("search", search.value);
  await nextTick(() => {
    loading.value = false;
    // 等 500ms 动画
    setTimeout(() => {
      if (renderSelect.value.length === 0) {
        showSnackbar({
          color: "error",
          text: "没有搜索到相关成就",
        });
        return;
      }
      showSnackbar({
        text: `已获取 ${renderSelect.value.length} 条成就数据`,
      });
    }, 500);
  });
}

// 导入 UIAF 数据，进行数据合并、刷新
async function importJson(): Promise<void> {
  const selectedFile = await dialog.open({
    title: "选择 UIAF 数据文件",
    multiple: false,
    filters: [
      {
        name: "UIAF JSON",
        extensions: ["json"],
      },
    ],
    defaultPath: await path.downloadDir(),
    directory: false,
  });
  if (!selectedFile) {
    showSnackbar({
      color: "grey",
      text: "已取消文件选择",
    });
    return;
  }
  if (!(await verifyUiafData(<string>selectedFile))) {
    showSnackbar({
      color: "error",
      text: "读取 UIAF 数据失败，请检查文件是否符合规范",
    });
    return;
  }
  const remoteRaw = await readUiafData(<string>selectedFile);
  loadingTitle.value = "正在解析数据";
  loading.value = true;
  loadingTitle.value = "正在合并成就数据";
  await TGSqlite.mergeUIAF(remoteRaw.list);
  loadingTitle.value = "即将刷新页面";
  setTimeout(() => {
    window.location.reload();
  }, 1000);
}

// 导出
async function exportJson(): Promise<void> {
  // 判断是否有数据
  if (achievementsStore.finAchievements === 0) {
    showSnackbar({
      color: "error",
      text: "没有可导出的数据",
    });
    return;
  }
  // 获取本地数据
  const UiafData = {
    info: await getUiafHeader(),
    list: await TGSqlite.getUIAF(),
  };
  const fileName = `UIAF_${UiafData.info.export_app}_${UiafData.info.export_app_version}_${UiafData.info.export_timestamp}`;
  const isSave = await dialog.save({
    title: "导出 UIAF 数据",
    filters: [
      {
        name: "UIAF JSON",
        extensions: ["json"],
      },
    ],
    defaultPath: `${await path.downloadDir()}${path.sep}${fileName}.json`,
  });
  if (isSave) {
    await fs.writeTextFile(isSave, JSON.stringify(UiafData));
    showSnackbar({ text: "导出成功" });
  } else {
    showSnackbar({
      color: "warn",
      text: "导出已取消",
    });
  }
}

function getIcon(series: number): string | undefined {
  return AppAchievementSeriesData.find((item) => item.id === series)?.icon;
}

// 处理外部导入
async function handleImportOuter(app: string): Promise<void> {
  const confirm = await showConfirm({
    title: "是否导入祈愿数据？",
    text: `来源APP：${app}`,
  });
  if (confirm) {
    // 读取 剪贴板
    const clipboard = await window.navigator.clipboard.readText();
    let data: TGApp.Plugins.UIAF.Achievement[];
    // 里面是完整的 uiaf 数据
    try {
      data = JSON.parse(clipboard).list;
      loadingTitle.value = "正在导入数据";
      loading.value = true;
      await TGSqlite.mergeUIAF(data);
      loading.value = false;
      showSnackbar({
        color: "success",
        text: "导入成功，即将刷新页面",
      });
    } catch (e) {
      console.error(e);
      showSnackbar({
        color: "error",
        text: "读取 UIAF 数据失败，请检查文件是否符合规范",
      });
    } finally {
      setTimeout(async () => {
        await router.push("/achievements");
      }, 1500);
    }
  } else {
    showSnackbar({
      color: "warn",
      text: "已取消导入",
    });
  }
}

// 改变成就状态
async function setAchi(
  achievement: TGApp.Sqlite.Achievement.SingleTable,
  target: boolean,
): Promise<void> {
  const newAchievement = achievement;
  if (target) {
    // 取消已完成
    newAchievement.isCompleted = 1;
    newAchievement.completedTime = getNowStr();
  } else {
    newAchievement.isCompleted = 0;
    newAchievement.completedTime = "";
  }
  renderSelect.value[renderSelect.value.findIndex((item) => item.id === achievement.id)] =
    newAchievement;
  await setAchiDB(newAchievement);
  await flushOverview();
  allSeriesData.value[allSeriesData.value.findIndex((item) => item.id === newAchievement.series)] =
    (await getSeriesData(newAchievement.series))[0];
  showSnackbar({
    text: `已将成就 ${newAchievement.name}[${newAchievement.id}] 标记为 ${
      target ? "已完成" : "未完成"
    }`,
  });
}

/* 以下为数据库操作 */
// 获取成就概况
async function getAchiOverview(): Promise<{
  total: number;
  fin: number;
}> {
  const db = await TGSqlite.getDB();
  const sql = "SELECT SUM(totalCount) AS total, SUM(finCount) AS fin FROM AchievementSeries;";
  const res: Array<{ total: number; fin: number }> = await db.select(sql);
  return res[0];
}

// 获取成就系列
async function getSeriesData(series?: number): Promise<TGApp.Sqlite.Achievement.SeriesTable[]> {
  const db = await TGSqlite.getDB();
  let sql = "SELECT * FROM AchievementSeries ORDER BY `order`;";
  if (series) {
    sql = `SELECT *
           FROM AchievementSeries
           WHERE id = ${series}
           ORDER BY \`order\`;`;
  }
  return await db.select(sql);
}

// 获取成就（某个系列）
async function getAchiData(
  type: "all" | "series" | "search",
  value?: string,
): Promise<TGApp.Sqlite.Achievement.SingleTable[]> {
  const db = await TGSqlite.getDB();
  let sql = "";
  if (type === "all" || (type == "series" && value === undefined)) {
    sql = "SELECT * FROM Achievements ORDER BY isCompleted, `order`;";
  } else if (type === "series") {
    sql = `SELECT *
           FROM Achievements
           WHERE series = ${value}
           ORDER BY isCompleted, \`order\`;`;
  } else if (type === "search") {
    if (value === undefined) {
      showSnackbar({
        color: "error",
        text: "搜索内容不能为空",
      });
      return [];
    }
    if (value.startsWith("v")) {
      const version = value.replace("v", "");
      sql = `SELECT *
             FROM Achievements
             WHERE version LIKE '%${version}%'
             ORDER BY isCompleted, \`order\`;`;
    } else {
      sql = `SELECT *
             FROM Achievements
             WHERE name LIKE '%${value}%'
                OR description LIKE '%${value}%'
             ORDER BY isCompleted, \`order\`;`;
    }
  }
  return await db.select(sql);
}

// 更新成就数据
async function setAchiDB(achievement: TGApp.Sqlite.Achievement.SingleTable): Promise<void> {
  const db = await TGSqlite.getDB();
  const sql = `UPDATE Achievements
               SET isCompleted   = ${achievement.isCompleted},
                   completedTime = '${achievement.completedTime}'
               WHERE id = ${achievement.id};`;
  await db.execute(sql);
}
</script>
<!-- 顶部栏跟 wrap 大概布局 -->
<style lang="css" scoped>
.top-bar {
  display: flex;
  width: 100%;
  height: 80px;
  align-items: center;
  justify-content: space-between;
  padding: 10px;
  border-radius: 5px;
  margin-bottom: 10px;
  background: var(--box-bg-1);
  column-gap: 50px;
  font-family: var(--font-title);
  font-size: 20px;
}

.top-title {
  color: var(--common-text-title);
  cursor: pointer;
}

.top-btns {
  display: flex;
  column-gap: 10px;
}

.top-btn {
  border-radius: 5px;
  background: var(--tgc-btn-1);
  color: var(--btn-text);
}

/* 内容区域 */
.wrap {
  display: flex;
  height: calc(100vh - 130px);
  column-gap: 10px;
}

/* 左侧系列 */
.left-wrap {
  display: flex;
  width: 400px;
  height: 100%;
  flex-direction: column;
  padding-right: 10px;
  overflow-y: auto;
  row-gap: 10px;
}

/* 右侧成就 */
.right-wrap {
  display: flex;
  width: 100%;
  height: 100%;
  flex-direction: column;
  padding-right: 10px;
  overflow-y: scroll;
  row-gap: 10px;
}
</style>
<!-- 左侧成就系列 wrap -->
<style lang="css" scoped>
.card-series {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  border-radius: 10px;
  background: var(--box-bg-1);
  color: var(--box-text-1);
  column-gap: 10px;
  cursor: pointer;
}

/* 版本信息 */
.series-version {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 80px;
  border-top: 1px solid var(--common-shadow-1);
  border-left: 1px solid var(--common-shadow-1);
  background: var(--box-bg-2);
  border-top-left-radius: 20px;
  color: var(--tgc-yellow-1);
  font-family: var(--font-title);
  font-size: 10px;
  text-align: center;
}

.series-icon {
  width: 40px;
  height: 40px;
  padding: 5px;
  border-radius: 5px;
  background:
    linear-gradient(to bottom, rgb(255 255 255 / 15%) 0%, rgb(0 0 0 / 15%) 100%),
    radial-gradient(at top center, rgb(255 255 255 / 40%) 0%, rgb(0 0 0 / 40%) 120%) #989898;
  background-blend-mode: multiply, multiply;
}

.series-content {
  display: flex;
  width: 100%;
  flex-flow: column wrap;
  align-items: flex-start;
  justify-content: center;
  text-align: left;
}

.series-content :nth-child(1) {
  font-family: var(--font-title);
  font-size: 14px;
}

.series-content :nth-child(2) {
  font-size: 12px;
  opacity: 0.8;
}
</style>
<!-- 右侧成就 -->
<style lang="css" scoped>
/* 成就卡片 */
.achi-series {
  position: relative;
  width: 100%;
  height: 80px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 10px 50px 50px 10px;
  background-position: right;
  background-repeat: no-repeat;
  cursor: pointer;
  font-family: var(--font-title);
}

.card-achi {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px;
  border-radius: 10px;
  background: var(--box-bg-1);
  color: var(--box-text-7);
}

/* 成就进度 */
.achi-progress {
  position: absolute;
  top: 0;
  left: 0;
  width: 50px;
  border-right: 1px solid var(--common-shadow-1);
  border-bottom: 1px solid var(--common-shadow-1);
  background: var(--box-bg-2);
  border-bottom-right-radius: 20px;
  color: var(--box-text-3);
  font-family: var(--font-title);
  font-size: 10px;
  text-align: center;
}

.achi-pre {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  column-gap: 10px;
}

.achi-pre-icon {
  display: flex;
  width: 30px;
  height: 30px;
  align-items: center;
  justify-content: center;
}

.achievement-finish img {
  width: 30px;
  height: 30px;
  filter: invert(51%) sepia(100%) saturate(353%) hue-rotate(42deg) brightness(107%) contrast(91%);
}

.achi-pre-info {
  display: flex;
  width: 100%;
  flex-flow: column wrap;
  align-items: flex-start;
  justify-content: center;
  text-align: left;
}

.achi-pre-info :nth-child(1) {
  font-family: var(--font-title);
  font-size: 14px;
}

.achi-append-icon span {
  position: absolute;
  bottom: 0;
  left: 0;
  display: flex;
  width: 100%;
  height: 10px;
  align-items: center;
  justify-content: center;
  background: rgb(0 0 0 / 50%);
  color: var(--tgc-white-1);
  font-size: 8px;
}

.achi-pre-info :nth-child(1) span {
  color: var(--tgc-pink-1);
  font-size: 12px;
}

.achi-pre-info :nth-child(2) {
  font-size: 12px;
  opacity: 0.8;
}

.achi-append {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  column-gap: 10px;
}

.achi-append :nth-last-child(2) {
  margin-right: 10px;
  color: var(--box-text-4);
  font-size: small;
}

.achi-append-icon {
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: 5px;
  background-image: url("/icon/bg/5-Star.webp");
  background-size: cover;
}

.achi-append-icon img {
  width: 40px;
  height: 40px;
}
</style>
