<!-- 游戏资源任务进度行的纯展示骨架 -->
<template>
  <section :class="{ embedded }" class="task-progress" :aria-label="ariaLabel">
    <div v-if="!embedded" class="task-progress-status">
      <span :class="captionTone">{{ caption }}</span>
      <div class="task-progress-actions">
        <slot name="actions" />
      </div>
    </div>

    <div v-if="showRows" class="task-progress-rows" aria-live="polite">
      <slot name="beforeRows" />
      <div v-for="row in rows" :key="row.label" class="task-progress-row">
        <div class="task-progress-row-head">
          <div class="task-progress-row-label">
            <span>{{ row.label }}</span>
            <span
              v-if="row.status !== null"
              :class="{ 'task-progress-complete': row.complete }"
              class="task-progress-row-status"
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
        <div class="task-progress-row-facts">
          <span v-for="detail in row.details" :key="detail">{{ detail }}</span>
          <span v-if="row.downloadObjectStatus !== null" class="task-progress-download-activity">
            <span>{{ row.downloadObjectStatus }}</span>
            <span
              v-if="row.activeAssemblyCount > 0"
              :aria-label="`正在组装 ${row.activeAssemblyCount} 个资源`"
              class="task-progress-assembly-slots"
              role="img"
              :title="`正在组装 ${row.activeAssemblyCount} 个资源`"
            >
              <span
                v-for="slot in row.activeAssemblyCount"
                :key="slot"
                aria-hidden="true"
                class="task-progress-assembly-slot"
              />
            </span>
          </span>
        </div>
      </div>
    </div>

    <p
      v-if="!embedded && errorMessage !== null && errorMessage !== caption"
      class="task-progress-error"
    >
      {{ errorMessage }}
    </p>
  </section>
</template>

<script lang="ts" setup>
type TaskProgressRow = {
  label: string;
  percent: number;
  indeterminate: boolean;
  complete: boolean;
  status: string | null;
  details: Array<string>;
  downloadObjectStatus: string | null;
  activeAssemblyCount: number;
};

type Props = {
  ariaLabel: string;
  caption: string;
  captionTone?: "err" | "warn" | "";
  rows: Array<TaskProgressRow>;
  embedded?: boolean;
  errorMessage?: string | null;
  showRows?: boolean;
};

const {
  ariaLabel,
  caption,
  captionTone = "",
  rows,
  embedded = false,
  errorMessage = null,
  showRows = true,
} = defineProps<Props>();

defineSlots<{
  actions?: () => unknown;
  beforeRows?: () => unknown;
}>();
</script>

<style lang="scss" scoped>
.task-progress {
  display: grid;
  padding: 12px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-2);
  gap: 8px;

  &.embedded {
    padding: 0;
    border: 0;
    background: transparent;
  }
}

.task-progress-status,
.task-progress-row-head {
  display: flex;
  align-items: center;
  color: var(--box-text-2);
  font-size: 12px;
  line-height: 16px;
}

.task-progress-status {
  gap: 8px;

  .warn {
    color: var(--tgc-od-orange);
  }

  .err {
    color: var(--tgc-od-red);
  }
}

.task-progress-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 4px;

  &:empty {
    display: none;
  }
}

.task-progress-rows {
  display: grid;
  gap: 10px;
}

.task-progress-row {
  display: grid;
  gap: 4px;
}

.task-progress-row-head {
  justify-content: space-between;
}

.task-progress-row-label {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.task-progress-row-status {
  overflow: hidden;
  min-width: 0;
  color: var(--common-text-title);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-progress-complete {
  color: var(--tgc-od-green);
}

.task-progress-row-head strong {
  flex-shrink: 0;
  color: var(--common-text-title);
  font-weight: normal;
}

.task-progress-row-facts {
  display: flex;
  flex-wrap: wrap;
  color: var(--box-text-2);
  font-size: 11px;
  gap: 4px 12px;
  line-height: 15px;
}

.task-progress-download-activity {
  display: inline-flex;
  min-height: 16px;
  align-items: center;
  gap: 4px;
  line-height: 16px;
}

.task-progress-assembly-slots {
  display: inline-flex;
  max-width: 160px;
  min-height: 16px;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;
  line-height: 0;
  vertical-align: middle;
}

.task-progress-assembly-slot {
  display: block;
  width: 8px;
  height: 8px;
  border-radius: 2px;
  background: var(--tgc-od-green);
}

.task-progress-error {
  margin: 0;
  color: var(--tgc-od-red);
  font-size: 12px;
  line-height: 16px;
}
</style>
