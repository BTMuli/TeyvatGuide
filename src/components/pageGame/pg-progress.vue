<template>
  <section class="progress-panel" :aria-label="ariaLabel">
    <div class="progress-status">
      <span :class="tone">{{ caption }}</span>
      <div class="progress-acts">
        <slot name="actions" />
      </div>
    </div>
    <v-progress-linear
      v-if="showBar"
      :indeterminate
      :model-value="percent"
      color="var(--tgc-od-orange)"
      height="8"
      rounded
    />
    <div v-if="facts.length > 0" class="progress-facts" aria-live="polite">
      <span v-for="fact in facts" :key="fact">{{ fact }}</span>
    </div>
    <p v-if="currentFile !== null" class="progress-current">当前：{{ currentFile }}</p>
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

.progress-current {
  overflow: hidden;
  margin: 0;
  color: var(--box-text-2);
  font-size: 12px;
  line-height: 16px;
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
