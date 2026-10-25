<!-- 祈愿记录页面 -->
<template>
  <v-app-bar>
    <template #prepend>
      <div class="gacha-top-title">
        <img alt="gacha" src="/UI/nav/userGacha.webp" />
        <span>祈愿记录</span>
        <v-select
          v-model="uidCur"
          :hide-details="true"
          :item-title="uidItemTitle"
          :item-value="uidItemValue"
          :items="uidList"
          density="compact"
          label="游戏UID"
          variant="outlined"
        >
          <template #selection="{ item }">
            <span>{{ maskUidTail(item) }}</span>
          </template>
        </v-select>
        <div class="gacha-top-period">
          <GroPeriodDates
            :end="periodRange.end"
            :label="periodLabel"
            :start="periodRange.start"
            @clear="clearPeriod"
            @commit="commitPeriodDates"
            @open-calendar="togglePeriodCalendar"
          />
          <v-menu
            v-model="periodMenu"
            :close-on-content-click="false"
            :open-on-click="false"
            :open-on-focus="false"
            activator="parent"
            location="bottom start"
            offset="12"
          >
            <v-locale-provider :messages locale="zhHans">
              <div class="gacha-top-cal">
                <v-date-picker
                  v-model="pickerDraft"
                  v-bind="periodPickerProps"
                  first-day-of-week="1"
                  hide-header
                  multiple="range"
                  show-adjacent-months
                  weekday-format="narrow"
                >
                  <template #day="{ props: dayProps, item }">
                    <v-btn v-bind="dayProps" :title="getVersionDayTitle(item.isoDate)">
                      {{ item.localized }}
                    </v-btn>
                    <span
                      v-if="getVersionColor(item.isoDate)"
                      :class="{
                        start: isVersionStartDay(item.isoDate),
                        end: isVersionEndDay(item.isoDate),
                      }"
                      :style="{ background: getVersionColor(item.isoDate) }"
                      class="gacha-top-cal-bar"
                    />
                    <span
                      v-if="!item.isAdjacent && isVersionStartDay(item.isoDate)"
                      :style="{ color: getVersionColor(item.isoDate) }"
                      class="gacha-top-cal-ver"
                    >
                      {{ getVersionStartLabel(item.isoDate) }}
                    </span>
                  </template>
                </v-date-picker>
                <div class="gacha-top-cal-footer">
                  <div class="gacha-top-cal-legend">
                    <button
                      v-for="item in visibleVersionLegend"
                      :key="item.key"
                      :class="{ active: isVersionPeriodSelected(item) }"
                      :title="item.title"
                      class="gacha-top-cal-legend-item"
                      type="button"
                      @click="previewVersionPeriod(item)"
                    >
                      <span :style="{ background: item.color }" class="gacha-top-cal-swatch" />
                      {{ item.label }}
                    </button>
                    <span
                      v-if="visibleVersionLegend.length === 0"
                      class="gacha-top-cal-legend-empty"
                    >
                      此月无版本卡池
                    </span>
                  </div>
                  <div class="gacha-top-cal-actions">
                    <v-btn
                      class="gacha-top-cal-now"
                      density="comfortable"
                      variant="text"
                      @click="jumpToToday"
                    >
                      现在
                    </v-btn>
                    <v-btn density="comfortable" variant="text" @click="cancelPeriodCalendar">
                      取消
                    </v-btn>
                    <v-btn
                      color="var(--tgc-od-blue)"
                      density="comfortable"
                      variant="text"
                      @click="savePeriodCalendar"
                    >
                      确定
                    </v-btn>
                  </div>
                </div>
              </div>
            </v-locale-provider>
          </v-menu>
        </div>
        <img
          alt="byd"
          class="gacha-top-byd"
          src="/icon/nation/千星奇域.webp"
          title="千星奇域"
          @click="toBeyond()"
        />
      </div>
    </template>
    <template #append>
      <div class="gacha-top-append">
        <div class="gacha-hutao-box">
          <div class="gacha-hutao-account" title="胡桃云" @click="tryLoginHutao()">
            <img alt="hutao" src="/platforms/other/hutao.webp" />
            <span>{{ userName ?? "登录胡桃云" }}</span>
          </div>
          <v-btn
            :disabled="!isLoginHutao"
            class="gacha-top-btn"
            prepend-icon="mdi-upload"
            variant="elevated"
            @click="tryUploadGacha()"
          >
            上传
          </v-btn>
          <v-btn
            :disabled="!isLoginHutao"
            class="gacha-top-btn"
            prepend-icon="mdi-download"
            variant="elevated"
            @click="tryDownloadGacha()"
          >
            下载
          </v-btn>
          <v-btn
            :disabled="!isLoginHutao"
            class="gacha-top-btn danger-btn"
            prepend-icon="mdi-delete"
            variant="elevated"
            @click="tryDeleteGacha()"
          >
            删除
          </v-btn>
        </div>
      </div>
    </template>
    <template #extension>
      <div class="gacha-top-btns">
        <v-btn
          class="gacha-top-btn"
          :disabled="isRefreshing"
          prepend-icon="mdi-refresh"
          variant="elevated"
          @click="confirmRefresh(false)"
        >
          增量刷新
        </v-btn>
        <v-btn
          class="gacha-top-btn"
          :disabled="isRefreshing"
          prepend-icon="mdi-refresh"
          variant="elevated"
          @click="confirmRefresh(true)"
        >
          全量刷新
        </v-btn>
        <v-btn
          class="gacha-top-btn"
          prepend-icon="mdi-import"
          variant="elevated"
          @click="importUigf()"
        >
          导入
        </v-btn>
        <v-btn
          class="gacha-top-btn"
          prepend-icon="mdi-export"
          variant="elevated"
          @click="exportUigf()"
        >
          导出
        </v-btn>
        <v-btn
          class="gacha-top-btn"
          prepend-icon="mdi-export"
          variant="elevated"
          @click="exportUigf4()"
        >
          导出(v4)
        </v-btn>
        <v-btn
          class="gacha-top-btn danger-btn"
          prepend-icon="mdi-delete"
          variant="elevated"
          @click="deleteGacha()"
        >
          删除
        </v-btn>
        <v-btn
          class="gacha-top-btn"
          prepend-icon="mdi-database-check"
          title="检测并补充遗漏的itemId"
          variant="elevated"
          @click="checkData()"
        >
          检测数据
        </v-btn>
        <v-spacer v-if="tab === 'overview'" />
        <v-btn-toggle
          v-if="tab === 'overview'"
          v-model="gridMode"
          :mandatory="true"
          aria-label="记录布局"
          class="gacha-view-toggle"
          color="var(--tgc-od-blue)"
          density="compact"
          title="切换记录布局"
          variant="outlined"
        >
          <v-btn aria-label="网格布局" :value="true" size="small" title="网格布局">
            <v-icon size="16">mdi-view-grid</v-icon>
          </v-btn>
          <v-btn aria-label="列表布局" :value="false" size="small" title="列表布局">
            <v-icon size="18">mdi-view-list</v-icon>
          </v-btn>
        </v-btn-toggle>
      </div>
    </template>
  </v-app-bar>
  <div class="gacha-container">
    <v-tabs v-model="tab" align-tabs="start" class="gacha-tab" density="compact">
      <v-tab value="overview">数据概览</v-tab>
      <v-tab value="echarts">图表概览</v-tab>
      <v-tab value="table">数据表格</v-tab>
      <v-tab value="rerun">复刻周期</v-tab>
      <v-tab value="history">过往祈愿</v-tab>
    </v-tabs>
    <v-window v-model="tab" class="gacha-window">
      <v-window-item class="gacha-window-item" value="overview">
        <GroOverview
          v-model="gachaListCur"
          :gridMode
          :periodEnd="periodRange.end"
          :periodStart="periodRange.start"
          :versionFilter
        />
      </v-window-item>
      <v-window-item class="gacha-window-item" value="echarts">
        <GroEcharts v-if="uidCur" :records="gachaListView" :uid="uidCur" />
      </v-window-item>
      <v-window-item class="gacha-window-item" value="table">
        <GroTable v-model="gachaListView" />
      </v-window-item>
      <v-window-item class="gacha-window-item" value="rerun">
        <GroRerun
          :periodEnd="periodRange.end"
          :periodStart="periodRange.start"
          :versionFilter
          @clear-period="clearPeriod"
        />
      </v-window-item>
      <v-window-item class="gacha-window-item" value="history">
        <GroHistory
          :periodEnd="periodRange.end"
          :periodStart="periodRange.start"
          :uid="uidCur"
          :versionFilter
        />
      </v-window-item>
    </v-window>
  </div>
  <UgoUid v-model="ovShow" :fpe="ovFpe" :fpi="ovFpi" :mode="ovMode" />
  <UgoHutaoDu v-model="hutaoShow" :mode="htMode" @selected="handleHutaoDu" />
</template>
<script lang="ts" setup>
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import GroEcharts from "@comp/userGacha/gro-echarts.vue";
import GroHistory from "@comp/userGacha/gro-history.vue";
import GroOverview from "@comp/userGacha/gro-overview.vue";
import GroPeriodDates from "@comp/userGacha/gro-period-dates.vue";
import GroRerun from "@comp/userGacha/gro-rerun.vue";
import GroTable from "@comp/userGacha/gro-table.vue";
import UgoHutaoDu from "@comp/userGacha/ugo-hutao-du.vue";
import UgoUid from "@comp/userGacha/ugo-uid.vue";
import { useGachaPeriodFilter } from "@hooks/useGachaPeriodFilter.js";
import { useGachaRefresh } from "@hooks/useGachaRefresh.js";
import { useGachaUigfFiles } from "@hooks/useGachaUigfFiles.js";
import { useHutaoGachaSync } from "@hooks/useHutaoGachaSync.js";
import TSUserGacha from "@Sqlm/userGacha.js";
import useUserStore from "@store/user.js";
import { maskUid, maskUidTail, uidItemTitle, uidItemValue } from "@utils/display/TGUid.js";
import { filterGachaDisplayList } from "@utils/gacha/version.js";
import TGHttps from "@utils/network/TGHttps.js";
import fetchYattaJson from "@utils/network/Yatta.js";
import TGLogger from "@utils/system/TGLogger.js";
import { storeToRefs } from "pinia";
import { computed, onMounted, ref, shallowRef, watch } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const { account } = storeToRefs(useUserStore());

const uidCur = ref<string>();
const tab = ref<string>("overview");
const gridMode = ref<boolean>(false);
const uidList = shallowRef<Array<string>>([]);
const gachaListCur = shallowRef<Array<TGApp.Sqlite.Gacha.Gacha>>([]);
const yattaData = shallowRef<Array<TGApp.Plugins.Yatta.ConvertData>>([]);

// 筛选域
const {
  versionFilter,
  periodMenu,
  pickerDraft,
  periodRange,
  periodLabel,
  periodPickerProps,
  visibleVersionLegend,
  messages,
  getVersionColor,
  getVersionStartLabel,
  isVersionStartDay,
  isVersionEndDay,
  getVersionDayTitle,
  isVersionPeriodSelected,
  previewVersionPeriod,
  togglePeriodCalendar,
  cancelPeriodCalendar,
  savePeriodCalendar,
  clearPeriod,
  commitPeriodDates,
  jumpToToday,
} = useGachaPeriodFilter();

const gachaListView = computed<Array<TGApp.Sqlite.Gacha.Gacha>>(() =>
  filterGachaDisplayList(gachaListCur.value, versionFilter.value, periodRange.value),
);

// 刷新域
const { isRefreshing, confirmRefresh } = useGachaRefresh({
  uidCur,
  yattaData,
  loadYatta,
  reloadUid,
  loadGachaList,
});

// UIGF 文件域
const {
  ovMode,
  ovShow,
  ovFpi,
  ovFpe,
  importUigf,
  exportUigf,
  exportUigf4,
  deleteGacha,
  checkData,
} = useGachaUigfFiles({
  uidCur,
  gachaListCur,
  yattaData,
  loadYatta,
  reloadUid,
  loadGachaList,
});

// 胡桃云域
const {
  hutaoShow,
  htMode,
  userName,
  isLoginHutao,
  tryLoginHutao,
  tryUploadGacha,
  tryDownloadGacha,
  tryDeleteGacha,
  handleHutaoDu,
} = useHutaoGachaSync({ yattaData, loadYatta });

onMounted(async () => {
  await showLoading.start("正在加载祈愿数据", "正在获取祈愿 UID 列表");
  await TGLogger.Info("[UserGacha][onMounted] 进入角色祈愿页面");
  await reloadUid();
  await showLoading.end();
});

watch(
  () => uidCur.value,
  async () => await loadGachaList(),
);
watch(
  () => account.value,
  async () => await reloadUid(),
);

async function loadYatta(): Promise<void> {
  try {
    yattaData.value = await fetchYattaJson();
  } catch (e) {
    const errMsg = TGHttps.getErrMsg(e);
    showSnackbar.error(`获取Yatta数据失败：${errMsg}`);
    await TGLogger.Error(`[Gacha][loadYatta] 获取Yatta数据失败`);
    await TGLogger.Error(`[Gacha][loadYatta] ${e}`);
  }
}

async function loadGachaList(): Promise<void> {
  if (uidCur.value === undefined || uidCur.value === "") return;
  gachaListCur.value = await TSUserGacha.record.all(uidCur.value);
  showSnackbar.success(
    `成功获取 ${maskUid(uidCur.value)} 的 ${gachaListCur.value.length} 条祈愿数据`,
  );
  await TGLogger.Info(
    `[UserGacha][loadGachaList] 成功获取 ${gachaListCur.value.length} 条祈愿数据`,
  );
}

async function reloadUid(uid?: string): Promise<void> {
  uidList.value = await TSUserGacha.getUidList();
  if (uidList.value.length === 0) uidList.value = [account.value.gameUid];
  if (uidList.value.includes(account.value.gameUid)) {
    if (uid === undefined) uidCur.value = account.value.gameUid;
  } else {
    uidList.value = [account.value.gameUid, ...uidList.value];
    if (uid === undefined) uidCur.value = uidList.value[0];
  }
}

async function toBeyond(): Promise<void> {
  await router.push({ name: "颂愿记录" });
}
</script>

<style lang="scss" scoped>
.gacha-top-title {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 12px;
  column-gap: 8px;

  img {
    width: 32px;
    height: 32px;

    &:last-child {
      cursor: pointer;
    }
  }

  span {
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 20px;
  }
}

.gacha-top-byd {
  filter: invert(0.75);
}

.dark .gacha-top-byd {
  filter: none;
}

.gacha-top-append {
  position: relative;
  margin-right: 16px;
}

.gacha-hutao-box {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 8px;
}

.gacha-hutao-account {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--tgc-od-red);
  column-gap: 4px;
  cursor: pointer;

  img {
    width: 20px;
    height: 20px;
    object-fit: contain;
  }
}

.gacha-top-btns {
  display: flex;
  min-width: 0;
  flex: 1 1 auto;
  align-items: center;
  margin-right: 16px;
  margin-bottom: 4px;
  margin-left: 16px;
  column-gap: 8px;
}

.gacha-view-toggle.v-btn-toggle {
  height: 32px;
  flex: 0 0 auto;
  border-radius: 4px;
}

.gacha-top-period {
  width: 256px;
  flex: 0 0 auto;
}

.gacha-top-cal {
  overflow: hidden;
  border-radius: 12px;
  background: var(--box-bg-1);
  box-shadow: 0 8px 24px var(--common-shadow-4);
}

.gacha-top-cal-bar {
  position: absolute;
  z-index: 1;
  right: 0;
  bottom: 4px;
  left: 0;
  height: 4px;
  border-radius: 0;
  pointer-events: none;

  &.start {
    left: 4px;
    border-bottom-left-radius: 2px;
    border-top-left-radius: 2px;
  }

  &.end {
    right: 4px;
    border-bottom-right-radius: 2px;
    border-top-right-radius: 2px;
  }
}

.gacha-top-cal-ver {
  position: absolute;
  z-index: 1;
  top: 0;
  left: 0;
  overflow: hidden;
  width: 100%;
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  line-height: 12px;
  pointer-events: none;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gacha-top-cal-footer {
  display: flex;
  width: 100%;
  box-sizing: border-box;
  flex-direction: column;
  padding: 0 8px 8px;
  gap: 8px;
}

.gacha-top-cal-legend {
  display: flex;
  min-height: 16px;
  flex-wrap: wrap;
  align-items: center;
  padding: 0 4px;
  gap: 8px;
}

.gacha-top-cal-legend-item {
  display: flex;
  align-items: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--box-text-4);
  column-gap: 4px;
  cursor: pointer;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  line-height: 16px;

  &:hover,
  &:focus-visible {
    color: var(--app-page-content);
  }

  &.active {
    color: var(--common-text-title);
  }
}

.gacha-top-cal-swatch {
  display: block;
  width: 8px;
  height: 8px;
  flex-shrink: 0;
  border-radius: 2px;
}

.gacha-top-cal-legend-empty {
  color: var(--box-text-4);
  font-size: 12px;
  line-height: 16px;
}

.gacha-top-cal-actions {
  display: flex;
  align-items: center;
  column-gap: 8px;
}

.gacha-top-cal-now {
  margin-right: auto;
}

.gacha-top-btn {
  background: var(--tgc-btn-1);
  color: var(--btn-text);
}

.gacha-container {
  display: flex;
  height: calc(100vh - 144px);
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  border: 1px solid var(--common-shadow-2);
  border-radius: 4px;
  background: var(--app-page-bg);
}

.gacha-tab {
  height: 40px;
  flex: none;
  color: var(--box-text-4);
  font-family: var(--font-title);

  img {
    width: 16px;
    height: 16px;
    margin-right: 4px;
  }
}

.gacha-window {
  width: 100%;
  min-height: 0;
  flex: 1;
  padding: 8px;
}

.gacha-window :deep(.v-window__container) {
  height: 100%;
}

.gacha-window-item {
  height: 100%;
}

.danger-btn {
  color: var(--tgc-od-red);
}
</style>
