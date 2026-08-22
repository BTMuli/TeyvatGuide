<template>
  <section class="progress-panel" :aria-label="ariaLabel">
    <div class="progress-status">
      <span :class="tone">{{ caption }}</span>
      <div class="progress-acts">
        <slot name="actions" />
      </div>
    </div>
    <v-progress-linear
      v-if="showBar && progressRows.length === 0"
      :indeterminate
      :model-value="percent"
      color="var(--tgc-od-orange)"
      height="8"
      rounded
    />
    <div v-if="showBar && progressRows.length > 0" class="progress-rows">
      <div v-for="row in progressRows" :key="row.label" class="progress-row">
        <div class="progress-row-head">
          <span>{{ row.label }}</span>
          <strong>{{ row.percent.toFixed(0) }}%</strong>
        </div>
        <v-progress-linear
          :indeterminate="row.indeterminate"
          :model-value="row.percent"
          color="var(--tgc-od-orange)"
          height="8"
          rounded
        />
        <div class="progress-row-facts">
          <span v-for="detail in row.details" :key="detail">{{ detail }}</span>
        </div>
      </div>
    </div>
    <div v-if="facts.length > 0" class="progress-facts" aria-live="polite">
      <span v-for="fact in facts" :key="fact">{{ fact }}</span>
    </div>
    <p v-if="currentFile !== null" class="progress-current">
      <span class="progress-current-label">当前资源：</span>
      <span class="progress-current-value" :title="currentFile">{{ currentFile }}</span>
    </p>
    <p v-if="errorMessage !== null && errorMessage !== caption" class="progress-error">
      {{ errorMessage }}
    </p>
  </section>
</template>

<script lang="ts" setup>
type Props = {
  ariaLabel?: string;
  caption: string;
  currentFile?: string | null;
  errorMessage?: string | null;
  facts?: Array<string>;
  indeterminate?: boolean;
  percent?: number;
  progressRows?: Array<{
    label: string;
    percent: number;
    indeterminate?: boolean;
    details: Array<string>;
  }>;
  showBar?: boolean;
  tone?: "err" | "ok" | "warn" | "";
};

const {
  ariaLabel = "任务进度",
  caption,
  currentFile = null,
  errorMessage = null,
  facts = [],
  indeterminate = false,
  percent = 0,
  progressRows = [],
  showBar = true,
  tone = "",
} = defineProps<Props>();

defineSlots<{
  actions?: () => unknown;
}>();
</script>

<style lang="scss" scoped>
.progress-panel {
  display: grid;
  padding: 12px;
  border-radius: 4px;
  background: var(--box-bg-2);
  gap: 8px;
  margin-inline: 16px;
}

.progress-status {
  display: flex;
  align-items: center;
  color: var(--box-text-2);
  font-size: 12px;
  gap: 8px;
  line-height: 16px;

  .ok {
    color: var(--tgc-od-green);
  }

  .warn {
    color: var(--tgc-od-orange);
  }

  .err {
    color: var(--tgc-od-red);
  }
}

.progress-acts {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 4px;

  &:empty {
    display: none;
  }
}

.progress-facts {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  color: var(--box-text-2);
  font-size: 12px;
  gap: 8px 16px;
  line-height: 16px;
}

.progress-rows {
  display: grid;
  gap: 10px;
}

.progress-row {
  display: grid;
  gap: 4px;
}

.progress-row-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--box-text-2);
  font-size: 12px;
  line-height: 16px;

  strong {
    color: var(--common-text-title);
    font-weight: normal;
  }
}

.progress-row-facts {
  display: flex;
  flex-wrap: wrap;
  color: var(--box-text-2);
  font-size: 11px;
  gap: 4px 12px;
  line-height: 15px;
}

.progress-current {
  display: flex;
  min-width: 0;
  margin: 0;
  color: var(--box-text-2);
  font-size: 12px;
  gap: 4px;
  line-height: 16px;
}

.progress-current-label {
  flex-shrink: 0;
}

.progress-current-value {
  overflow: hidden;
  min-width: 0;
  color: var(--common-text-title);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.progress-error {
  margin: 0;
  color: var(--tgc-od-red);
  font-size: 12px;
  line-height: 16px;
}
</style>
