<template>
  <section :class="tone" class="game-notice" :role="tone === 'error' ? 'alert' : 'status'">
    <v-icon :icon="noticeIcon" size="18" />
    <div class="game-notice-copy">
      <strong v-if="title !== null">{{ title }}</strong>
      <span>{{ text }}</span>
    </div>
  </section>
</template>

<script lang="ts" setup>
import { computed } from "vue";

type Props = {
  text: string;
  title?: string | null;
  tone?: "error" | "info" | "success" | "warning";
};

const { text, title = null, tone = "info" } = defineProps<Props>();
const noticeIcon = computed<string>(() => {
  switch (tone) {
    case "error":
      return "mdi-alert-circle-outline";
    case "success":
      return "mdi-check-circle-outline";
    case "warning":
      return "mdi-alert-outline";
    default:
      return "mdi-information-outline";
  }
});
</script>

<style lang="scss" scoped>
.game-notice {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  padding: 10px 12px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-2);
  border-inline-start-width: 3px;
  color: var(--box-text-2);
  gap: 8px;

  > .v-icon {
    flex-shrink: 0;
    margin-block-start: 1px;
  }

  &.info {
    border-inline-start-color: var(--tgc-od-blue);

    > .v-icon {
      color: var(--tgc-od-blue);
    }
  }

  &.success {
    border-inline-start-color: var(--tgc-od-green);

    > .v-icon {
      color: var(--tgc-od-green);
    }
  }

  &.warning {
    border-inline-start-color: var(--tgc-od-orange);

    > .v-icon {
      color: var(--tgc-od-orange);
    }
  }

  &.error {
    border-inline-start-color: var(--tgc-od-red);

    > .v-icon {
      color: var(--tgc-od-red);
    }
  }
}

.game-notice-copy {
  display: grid;
  min-width: 0;
  gap: 2px;

  strong {
    color: var(--common-text-title);
    font-size: 13px;
    font-weight: 600;
    line-height: 18px;
  }

  span {
    font-size: 12px;
    line-height: 18px;
  }
}
</style>
