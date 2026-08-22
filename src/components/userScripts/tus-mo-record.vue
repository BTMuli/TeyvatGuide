<!-- 米游币获取/消耗记录浮窗 -->
<template>
  <TOverlay v-model="visible" blurVal="4px" topOffset="64px">
    <div class="tus-mr-box">
      <div class="tus-mr-top">
        <span>米游币记录</span>
        <div class="tus-mr-actions">
          <v-btn-toggle
            v-model="isCost"
            :divided="false"
            :mandatory="true"
            aria-label="记录类型"
            class="tus-mr-switch"
            color="var(--tgc-od-blue)"
            density="compact"
            variant="tonal"
          >
            <v-btn :value="false">获取记录</v-btn>
            <v-btn :value="true">消耗记录</v-btn>
          </v-btn-toggle>
          <v-icon-btn
            :loading="loadState"
            class="tus-mr-refresh"
            icon="mdi-refresh"
            size="14"
            title="刷新"
            variant="flat"
            @click="tryRefresh()"
          />
        </div>
      </div>
      <div ref="listRef" class="tus-mr-content">
        <div v-if="recordList.length === 0 && !loadState" class="tus-mr-empty">暂无记录</div>
        <div
          v-for="(item, idx) in recordList"
          :key="idx"
          :class="isCost ? 'cost' : 'gain'"
          class="tus-mr-item"
        >
          <v-icon
            :class="isCost ? 'cost' : 'gain'"
            :icon="isCost ? 'mdi-arrow-down' : 'mdi-arrow-up'"
            class="tus-mr-item-icon"
            size="18"
          />
          <div class="tus-mr-item-body">
            <div class="tus-mr-item-main">
              <span :title="item.title" class="tus-mr-item-title">{{ item.title }}</span>
              <span :class="isCost ? 'cost' : 'gain'" class="tus-mr-item-num">
                {{ isCost ? "-" : "+" }}{{ item.num }}
              </span>
            </div>
            <div class="tus-mr-item-meta">
              <span class="tus-mr-item-type">{{ item.type_name }}</span>
              <span
                :title="fmtUtil.dateTime(Number(item.order_time) * 1000)"
                class="tus-mr-item-time"
              >
                <v-icon size="12">mdi-clock-outline</v-icon>
                {{ fmtUtil.nearTime(Number(item.order_time)) }}
              </span>
            </div>
          </div>
        </div>
        <div v-if="hasMore" class="tus-mr-more" @click="loadMore()">
          <v-progress-circular
            v-if="loadState"
            :size="16"
            :width="2"
            color="var(--tgc-od-blue)"
            indeterminate
          />
          <span v-else>加载更多</span>
        </div>
      </div>
    </div>
  </TOverlay>
</template>
<script lang="ts" setup>
import TOverlay from "@comp/app/t-overlay.vue";
import showSnackbar from "@comp/func/snackbar.js";
import { useBoxReachBottom } from "@hooks/reachBottom.js";
import bbsReq from "@req/bbsReq.js";
import fmtUtil from "@utils/fmtUtil.js";
import TGHttps from "@utils/TGHttps.js";
import TGLogger from "@utils/TGLogger.js";
import { ref, shallowRef, useTemplateRef, watch } from "vue";

/** 组件参数 */
type TusMoRecordProps = {
  /** 米社账号 */
  account: TGApp.App.Account.User | undefined;
};

const listEl = useTemplateRef<HTMLDivElement>("listRef");
const { isReachBottom } = useBoxReachBottom(listEl);

const visible = defineModel<boolean>();
const props = defineProps<TusMoRecordProps>();

const loadState = ref<boolean>(false);
const isCost = ref<boolean>(false);
const lastTime = ref<string>("0");
const hasMore = ref<boolean>(true);
const recordList = shallowRef<Array<TGApp.BBS.Mission.MybRecItem>>([]);

watch(
  () => props.account,
  () => {
    recordList.value = [];
    lastTime.value = "0";
    hasMore.value = false;
  },
);
watch(
  () => isCost.value,
  () => {
    recordList.value = [];
    lastTime.value = "0";
    hasMore.value = false;
    if (props.account) void tryRefresh();
  },
);
watch(
  () => visible.value,
  async () => {
    if (visible.value) await tryRefresh();
  },
);
watch(
  () => isReachBottom.value,
  async () => {
    if (!isReachBottom.value) return;
    await loadMore();
  },
);

async function tryRefresh(): Promise<void> {
  if (!props.account) {
    showSnackbar.warn("未检测到当前账号数据");
    return;
  }
  loadState.value = true;
  recordList.value = [];
  lastTime.value = "0";
  hasMore.value = true;
  await fetchRecords(props.account.cookie);
  loadState.value = false;
}

async function fetchRecords(ck: TGApp.App.Account.Cookie): Promise<void> {
  try {
    const resp = await bbsReq.mybRecord(ck, isCost.value, lastTime.value);
    if (resp.retcode !== 0) {
      showSnackbar.error(`[${resp.retcode}] ${resp.message}`);
      return;
    }
    const list = resp.data.list;
    if (list.length > 0) {
      lastTime.value = list[list.length - 1].order_time;
      recordList.value = [...recordList.value, ...list];
    }
    hasMore.value = list.length === 20;
  } catch (e) {
    const errMsg = TGHttps.getErrMsg(e);
    await TGLogger.Error(`[米游币记录]获取记录异常：${errMsg}`);
    showSnackbar.error(`获取记录失败：${errMsg}`);
  }
}

async function loadMore(): Promise<void> {
  if (!props.account) return;
  if (!hasMore.value) {
    showSnackbar.warn("没有更多了");
    return;
  }
  loadState.value = true;
  await fetchRecords(props.account.cookie);
  loadState.value = false;
}
</script>
<style lang="scss" scoped>
.tus-mr-box {
  position: relative;
  display: flex;
  width: 400px;
  height: 500px;
  box-sizing: border-box;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 12px;
  background-color: var(--app-page-bg);
  box-shadow:
    0 8px 24px var(--common-shadow-2),
    0 2px 8px var(--common-shadow-1);
  color: var(--app-page-content);
  row-gap: 8px;
}

.tus-mr-top {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  color: var(--common-text-title);
  column-gap: 8px;
  font-family: var(--font-title);
  font-size: 16px;
  font-weight: normal;
  line-height: 22px;
}

.tus-mr-refresh {
  position: relative;
  display: flex;
  align-items: center;
  background: transparent;
  color: var(--tgc-od-orange);
  gap: 8px;
}

.tus-mr-actions {
  display: flex;
  align-items: center;
  margin-left: auto;
  gap: 8px;
}

.tus-mr-switch {
  overflow: hidden;
  flex-shrink: 0;
  border-radius: 4px;

  :deep(.v-btn) {
    min-width: 0;
    flex: 1 1 50%;
    border-color: var(--box-bg-3);
    border-radius: 0;
    color: var(--box-text-2);
    font-size: 14px;
    font-weight: normal;
  }

  :deep(.v-btn:first-child) {
    border-bottom-left-radius: 4px;
    border-top-left-radius: 4px;
  }

  :deep(.v-btn:last-child) {
    border-bottom-right-radius: 4px;
    border-top-right-radius: 4px;
  }

  :deep(.v-btn--selected) {
    background: var(--box-bg-4);
    color: var(--common-text-title);
  }
}

.tus-mr-btn {
  background: var(--tgc-btn-1);
  color: var(--btn-text);
}

.tus-mr-content {
  position: relative;
  display: flex;
  width: 100%;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  padding-right: 4px;
  overflow-y: auto;
  row-gap: 8px;
}

.tus-mr-empty {
  display: flex;
  height: 100%;
  align-items: center;
  justify-content: center;
  color: var(--box-text-2);
  font-size: 14px;
}

.tus-mr-item {
  position: relative;
  display: flex;
  width: 100%;
  box-sizing: border-box;
  align-items: center;
  padding: 8px 12px 8px 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  border-left: 3px solid var(--common-shadow-1);
  background: var(--box-bg-1);
  color: var(--box-text-1);
  gap: 8px;

  &.gain {
    border-left-color: var(--tgc-od-green);
  }

  &.cost {
    border-left-color: var(--tgc-od-red);
  }

  &:hover {
    background: var(--box-bg-2);
    box-shadow: 0 1px 4px var(--common-shadow-1);
  }
}

.tus-mr-item-icon {
  flex-shrink: 0;

  &.gain {
    color: var(--tgc-od-green);
  }

  &.cost {
    color: var(--tgc-od-red);
  }
}

.tus-mr-item-body {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  row-gap: 4px;
}

.tus-mr-item-main {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  column-gap: 8px;
}

.tus-mr-item-title {
  overflow: hidden;
  min-width: 0;
  flex: 1;
  font-size: 14px;
  line-height: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tus-mr-item-num {
  flex-shrink: 0;
  font-family: var(--font-title);
  font-size: 14px;
  font-weight: normal;
  line-height: 20px;

  &.gain {
    color: var(--tgc-od-green);
  }

  &.cost {
    color: var(--tgc-od-red);
  }
}

.tus-mr-item-meta {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  color: var(--box-text-2);
  column-gap: 8px;
  font-size: 12px;
  line-height: 16px;
  opacity: 0.75;
}

.tus-mr-item-type {
  overflow: hidden;
  min-width: 0;
  max-width: 80px;
  padding: 2px 6px;
  border-radius: 2px;
  background: var(--box-bg-4);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tus-mr-item-time {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  column-gap: 2px;
  white-space: nowrap;
}

.tus-mr-more {
  position: relative;
  display: flex;
  height: 32px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  padding: 6px;
  color: var(--tgc-od-blue);
  cursor: pointer;
  font-size: 13px;

  &:hover {
    border-radius: 4px;
    background: var(--box-bg-3);
  }
}
</style>
