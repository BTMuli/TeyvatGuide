<!-- 米游币获取/消耗记录浮窗 -->
<template>
  <TOverlay v-model="visible" blur-val="5px">
    <div class="tusmr-box">
      <div class="tusmr-top">
        <div class="tusmr-title">米游币记录</div>
        <div class="tusmr-acts">
          <v-btn :loading="loadState" class="tusmr-btn" @click="tryRefresh()">刷新</v-btn>
        </div>
      </div>
      <div class="tusmr-switch-box">
        <span :class="{ active: !isCost }" class="tusmr-switch" @click="switchTab(false)">
          获取记录
        </span>
        <span :class="{ active: isCost }" class="tusmr-switch" @click="switchTab(true)">
          消耗记录
        </span>
      </div>
      <div ref="listRef" class="tusmr-content">
        <div v-if="recordList.length === 0 && !loadState" class="tusmr-empty">暂无记录</div>
        <div v-for="(item, idx) in recordList" :key="idx" class="tusmr-item">
          <span class="tusmr-item-title">{{ item.title }}</span>
          <span class="tusmr-item-type">{{ item.type_name }}</span>
          <span :class="isCost ? 'cost' : 'gain'" class="tusmr-item-num">
            {{ isCost ? "-" : "+" }}{{ item.num }}
          </span>
          <span class="tusmr-item-time">{{ formatTime(item.order_time) }}</span>
        </div>
      </div>
      <div v-if="hasMore" class="tusmr-more" @click="loadMore()">
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

/** 组件参数 */
type TusMoRecordProps = {
  /** 米社账号 */
  account: TGApp.App.Account.User | undefined;
};

const visible = defineModel<boolean>();
const props = defineProps<TusMoRecordProps>();

const loadState = ref<boolean>(false);
const isCost = ref<boolean>(false);
const recordList = shallowRef<Array<TGApp.BBS.Mission.MybRecItem>>([]);
const lastTime = ref<string>("0");
const hasMore = ref<boolean>(false);
const listEl = useTemplateRef<HTMLDivElement>("listRef");
let autoLoading = false;
const { isReachBottom } = useBoxReachBottom(listEl);

watch(
  () => props.account,
  () => {
    recordList.value = [];
    lastTime.value = "0";
    hasMore.value = false;
  },
);

watch(visible, async (val) => {
  if (val && props.account) await tryRefresh();
});

watch(isReachBottom, async (val) => {
  if (val && hasMore.value && !loadState.value && !autoLoading) {
    autoLoading = true;
    await loadMore();
    autoLoading = false;
  }
});

function switchTab(cost: boolean): void {
  if (cost === isCost.value) return;
  isCost.value = cost;
  recordList.value = [];
  lastTime.value = "0";
  hasMore.value = false;
  if (props.account) void tryRefresh();
}

function formatTime(time: string): string {
  const date = new Date(Number(time) * 1000);
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${m}-${d} ${h}:${min}`;
}

async function tryRefresh(): Promise<void> {
  if (!props.account) {
    showSnackbar.warn("未检测到当前账号数据");
    return;
  }
  loadState.value = true;
  recordList.value = [];
  lastTime.value = "0";
  hasMore.value = false;
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
    hasMore.value = list.length >= 20;
  } catch (e) {
    const errMsg = TGHttps.getErrMsg(e);
    await TGLogger.Error(`[米游币记录]获取记录异常：${errMsg}`);
    showSnackbar.error(`获取记录失败：${errMsg}`);
  }
}

async function loadMore(): Promise<void> {
  if (!props.account || hasMore.value === false || autoLoading) return;
  loadState.value = true;
  await fetchRecords(props.account.cookie);
  loadState.value = false;
}
</script>
<style lang="scss" scoped>
.tusmr-box {
  position: relative;
  display: flex;
  width: 500px;
  height: 500px;
  box-sizing: border-box;
  flex-direction: column;
  padding: 12px;
  border-radius: 4px;
  background: var(--box-bg-1);
  color: var(--box-text-1);
}

.tusmr-top {
  position: relative;
  display: flex;
  width: 100%;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
}

.tusmr-title {
  font-family: var(--font-title);
  font-size: 18px;
}

.tusmr-acts {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tusmr-switch-box {
  position: relative;
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  margin-top: 8px;
  column-gap: 8px;
}

.tusmr-switch {
  padding: 4px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.3s;

  &.active {
    background: var(--tgc-od-blue);
    color: #ffffff;
  }

  &:hover:not(.active) {
    background: var(--box-bg-3);
  }
}

.tusmr-btn {
  background: var(--tgc-btn-1);
  color: var(--btn-text);
}

.tusmr-content {
  position: relative;
  display: flex;
  max-height: 380px;
  flex-direction: column;
  margin-top: 8px;
  gap: 2px;
  overflow-y: auto;
}

.tusmr-empty {
  display: flex;
  height: 100%;
  align-items: center;
  justify-content: center;
  color: var(--box-text-2);
  font-size: 14px;
}

.tusmr-item {
  position: relative;
  display: flex;
  width: 100%;
  box-sizing: border-box;
  align-items: center;
  padding: 6px 8px;
  border-radius: 4px;
  background: var(--box-bg-2);
  color: var(--box-text-2);
  gap: 8px;
}

.tusmr-item-title {
  overflow: hidden;
  flex: 1;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tusmr-item-type {
  overflow: hidden;
  max-width: 80px;
  color: var(--common-text-desc);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tusmr-item-num {
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

.tusmr-item-time {
  flex-shrink: 0;
  color: var(--common-text-desc);
  font-size: 11px;
}

.tusmr-more {
  display: flex;
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
