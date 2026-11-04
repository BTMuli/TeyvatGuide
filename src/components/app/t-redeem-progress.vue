<template>
  <v-menu
    v-if="items.length"
    v-model="detailsOpen"
    :closeOnContentClick="false"
    location="bottom end"
    :offset="8"
  >
    <template #activator="{ props: menuProps }">
      <button
        v-bind="menuProps"
        type="button"
        class="trp-summary"
        :aria-label="`已处理 ${completed} / ${items.length} 个兑换码，查看详情`"
      >
        <span class="trp-segments" aria-hidden="true">
          <span
            v-for="item in items"
            :key="item.code"
            class="trp-segment"
            :data-state="item.state"
            :title="`${item.code}：${stateLabel(item.state)}`"
          />
        </span>
        <span class="trp-count">{{ completed }} / {{ items.length }}</span>
        <v-icon :icon="detailsOpen ? 'mdi-chevron-up' : 'mdi-chevron-down'" size="16" />
      </button>
    </template>
    <div class="trp-details" aria-label="兑换详情">
      <div class="trp-details-title">
        兑换详情 <span>{{ completed }} / {{ items.length }}</span>
      </div>
      <div class="trp-list">
        <div v-for="item in items" :key="item.code" class="trp-detail" :data-state="item.state">
          <div class="trp-detail-heading">
            <span class="trp-code">{{ item.code }}</span>
            <span class="trp-state">
              <v-icon :icon="stateIcon(item.state)" size="14" />
              {{ stateLabel(item.state) }}
            </span>
          </div>
          <p>
            {{
              item.result?.message ?? (item.state === "running" ? "正在发送兑换请求" : "等待兑换")
            }}
          </p>
        </div>
      </div>
    </div>
  </v-menu>
</template>
<script lang="ts" setup>
import { computed, ref } from "vue";

type ProgressState = "waiting" | "running" | "success" | "failure" | "unknown" | "skipped";
type ProgressItem = {
  code: string;
  state: ProgressState;
  result?: TGApp.Game.Redeem.Result;
};

const { codes, results, currentCode, busy } = defineProps<{
  codes: Array<string>;
  results: Array<TGApp.Game.Redeem.Result>;
  currentCode: string;
  busy: boolean;
}>();
const detailsOpen = ref<boolean>(false);
const items = computed<Array<ProgressItem>>(() =>
  codes.map((code) => {
    const result = results.find((item) => item.code === code);
    let state: ProgressState = busy && currentCode === code ? "running" : "waiting";
    if (result) {
      if (result.retcode === 0) state = "success";
      else if (result.retcode === -1) state = "unknown";
      else if (result.retcode === -2) state = "skipped";
      else state = "failure";
    }
    return { code, state, result };
  }),
);
const completed = computed<number>(() => items.value.filter((item) => item.result).length);

function stateLabel(state: ProgressState): string {
  if (state === "success") return "兑换成功";
  if (state === "failure") return "兑换失败";
  if (state === "unknown") return "结果未知";
  if (state === "skipped") return "未发送";
  if (state === "running") return "兑换中";
  return "待兑换";
}

function stateIcon(state: ProgressState): string {
  if (state === "success") return "mdi-check-circle-outline";
  if (state === "failure") return "mdi-alert-circle-outline";
  if (state === "unknown") return "mdi-help-circle-outline";
  if (state === "skipped") return "mdi-minus-circle-outline";
  if (state === "running") return "mdi-progress-clock";
  return "mdi-clock-outline";
}
</script>
<style lang="scss" scoped>
.trp-summary,
.trp-details {
  --progress-waiting: var(--common-shadow-2);
  --progress-running: #005a9eff;
  --progress-success: #107c10ff;
  --progress-failure: #b10e1cff;
  --progress-unknown: #8a4b00ff;
  --progress-skipped: #767676ff;

  color: var(--app-page-content);
  font-family: var(--font-text);
}

.trp-summary {
  display: flex;
  width: 100%;
  min-width: 0;
  min-height: 32px;
  align-items: center;
  padding: 4px 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
  cursor: pointer;
  font-size: 12px;
  gap: 8px;
  line-height: 20px;
  outline: none;

  &:hover,
  &[aria-expanded="true"] {
    border-color: var(--common-shadow-4);
  }

  &:focus-visible {
    outline: 2px solid var(--common-text-title);
    outline-offset: 2px;
  }
}

.trp-segments {
  display: flex;
  overflow: hidden;
  min-width: 0;
  height: 6px;
  flex: 1;
  border-radius: 4px;
  gap: 2px;
}

.trp-segment {
  min-width: 0;
  flex: 1;
  border-radius: 2px;
  background: var(--progress-waiting);

  &[data-state="running"] {
    background: var(--progress-running);
  }

  &[data-state="success"] {
    background: var(--progress-success);
  }

  &[data-state="failure"] {
    background: var(--progress-failure);
  }

  &[data-state="unknown"] {
    background: var(--progress-unknown);
  }

  &[data-state="skipped"] {
    background: var(--progress-skipped);
  }
}

.trp-count {
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.trp-details {
  display: flex;
  overflow: hidden;
  width: min(356px, calc(100vw - 32px));
  max-height: min(320px, 50vh);
  box-sizing: border-box;
  flex-direction: column;
  border: 1px solid var(--common-shadow-2);
  border-radius: 12px;
  background: var(--app-page-bg);
  box-shadow: 0 4px 16px var(--common-shadow-t-2);
}

.trp-details-title {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px 4px;
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 14px;
  font-weight: normal;
  line-height: 20px;

  > span {
    color: var(--app-page-content);
    font-family: var(--font-text);
    font-size: 12px;
    opacity: 0.7;
  }
}

.trp-list {
  display: flex;
  overflow: auto;
  min-height: 0;
  flex-direction: column;
  padding: 8px;
  gap: 8px;
}

.trp-detail {
  flex-shrink: 0;
  padding: 8px;
  border-radius: 8px;
  background: var(--box-bg-1);
  font-size: 12px;
  line-height: 18px;

  p {
    margin: 4px 0 0;
    opacity: 0.75;
    overflow-wrap: anywhere;
  }

  .trp-state .v-icon {
    color: var(--progress-skipped);
  }

  &[data-state="running"] .trp-state .v-icon {
    color: var(--progress-running);
  }

  &[data-state="success"] .trp-state .v-icon {
    color: var(--progress-success);
  }

  &[data-state="failure"] .trp-state .v-icon {
    color: var(--progress-failure);
  }

  &[data-state="unknown"] .trp-state .v-icon {
    color: var(--progress-unknown);
  }
}

.trp-detail-heading {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.trp-code {
  min-width: 0;
  overflow-wrap: anywhere;
}

.trp-state {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

html.dark .trp-summary,
html.dark .trp-details {
  --progress-running: var(--tgc-od-blue);
  --progress-success: var(--tgc-od-green);
  --progress-failure: var(--tgc-od-red);
  --progress-unknown: var(--tgc-od-orange);
  --progress-skipped: var(--tgc-od-white);
}
</style>
