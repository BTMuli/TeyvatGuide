<template>
  <section class="progress-panel" :aria-label="ariaLabel">
    <div class="progress-status">
      <span :class="tone">{{ caption }}</span>
      <span
        v-if="currentFile !== null && progressRows.length === 0"
        class="progress-status-file"
        :title="currentFile"
      >
        {{ currentFile }}
      </span>
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
          <div class="progress-row-label">
            <span>{{ row.label }}</span>
            <span
              v-if="row.status !== null && row.status !== undefined"
              class="progress-row-status"
              :title="row.status"
            >
              {{ row.status }}
            </span>
          </div>
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
    status?: string | null;
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

  .progress-status-file {
    overflow: hidden;
    min-width: 0;
    color: var(--common-text-title);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

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

  .progress-row-label {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 8px;
  }

  .progress-row-status {
    overflow: hidden;
    min-width: 0;
    color: var(--common-text-title);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  strong {
    flex-shrink: 0;
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

.progress-error {
  margin: 0;
  color: var(--tgc-od-red);
  font-size: 12px;
  line-height: 16px;
}
</style>
