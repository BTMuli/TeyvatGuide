<!-- 米游币获取/消耗记录浮窗 -->
<template>
  <TOverlay v-model="visible" blur-val="5px">
    <div class="tus-mr-box">
      <div class="tus-mr-top">
        <span>米游币记录</span>
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
      <div class="tus-mr-switch-box">
        <v-btn
          :variant="isCost ? 'tonal' : 'elevated'"
          class="tus-mr-switch"
          color="blue"
          density="compact"
          @click="switchTab(false)"
        >
          获取记录
        </v-btn>
        <v-btn
          :variant="isCost ? 'elevated' : 'tonal'"
          class="tus-mr-switch"
          color="blue"
          density="compact"
          @click="switchTab(true)"
        >
          消耗记录
        </v-btn>
      </div>
      <div ref="listRef" class="tus-mr-content">
        <div v-if="recordList.length === 0 && !loadState" class="tus-mr-empty">暂无记录</div>
        <div v-for="(item, idx) in recordList" :key="idx" class="tus-mr-item">
          <span :class="isCost ? 'cost' : 'gain'" class="tus-mr-item-num">
            {{ isCost ? "-" : "+" }}{{ item.num }}
          </span>
          <span class="tus-mr-item-title">{{ item.title }}</span>
          <span class="tus-mr-item-type">{{ item.type_name }}</span>
          <span :title="timestampToDate(Number(item.order_time) * 1000)" class="tus-mr-item-time">
            {{ getNearTime(Number(item.order_time)) }}
          </span>
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
import bbsReq from "@req/bbsReq.js";
import showSnackbar from "@comp/func/snackbar.js";
import { useBoxReachBottom } from "@hooks/reachBottom.js";
import TGLogger from "@utils/TGLogger.js";
import TGHttps from "@utils/TGHttps.js";
import { ref, shallowRef, useTemplateRef, watch } from "vue";
import { getNearTime, timestampToDate } from "@utils/toolFunc.js";

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

function switchTab(cost: boolean): void {
  if (cost === isCost.value) return;
  isCost.value = cost;
  recordList.value = [];
  lastTime.value = "0";
  hasMore.value = false;
  if (props.account) void tryRefresh();
}

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
  height: 480px;
  box-sizing: border-box;
  flex-direction: column;
  padding: 8px;
  border-radius: 4px;
  background: var(--box-bg-1);
  color: var(--box-text-1);
  row-gap: 4px;
}

.tus-mr-top {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: flex-start;
  column-gap: 4px;
  font-family: var(--font-title);
  font-size: 18px;
}

.tus-mr-refresh {
  position: relative;
  display: flex;
  align-items: center;
  background: transparent;
  color: var(--tgc-od-orange);
  gap: 8px;
}

.tus-mr-switch-box {
  position: relative;
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  column-gap: 8px;
}

.tus-mr-switch {
  padding: 0 8px;
  font-size: 14px;
}

.tus-mr-btn {
  background: var(--tgc-btn-1);
  color: var(--btn-text);
}

.tus-mr-content {
  position: relative;
  display: flex;
  max-height: 400px;
  flex-direction: column;
  padding-right: 4px;
  overflow-y: auto;
  row-gap: 4px;
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
  padding: 4px 8px;
  border-radius: 2px;
  background: var(--box-bg-2);
  color: var(--box-text-2);
  gap: 8px;
}

.tus-mr-item-title {
  overflow: hidden;
  flex: 1;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tus-mr-item-type {
  overflow: hidden;
  max-width: 80px;
  color: var(--common-text-desc);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tus-mr-item-num {
  flex-shrink: 0;
  font-family: var(--font-title);
  font-size: 13px;
  font-weight: bold;

  &.gain {
    color: var(--tgc-od-green);
  }

  &.cost {
    color: var(--tgc-od-red);
  }
}

.tus-mr-item-time {
  flex-shrink: 0;
  color: var(--tgc-od-white);
  font-size: 11px;
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
