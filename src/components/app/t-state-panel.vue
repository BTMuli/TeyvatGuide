<!-- 统一加载、错误与空状态面板 -->
<template>
  <div
    :aria-live="liveMode"
    :class="{ 'is-fill': props.fill }"
    :role="role"
    :style="panelStyle"
    class="tsp"
  >
    <v-progress-circular v-if="props.variant === 'loading'" indeterminate size="28" />
    <v-icon v-else size="32">{{ iconValue }}</v-icon>
    <p>{{ props.message }}</p>
    <v-btn
      v-if="props.variant === 'error'"
      :disabled="props.disabled"
      type="button"
      variant="tonal"
      @click="emits('retry')"
    >
      {{ props.retryLabel }}
    </v-btn>
  </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";

/**
 * 状态面板参数。
 * @since Beta v0.13.1
 */
type TStatePanelProps = {
  /** 状态类型 */
  variant: "loading" | "error" | "empty";
  /** 展示文案 */
  message: string;
  /** 图标，空状态与错误状态可覆盖默认值 */
  icon?: string;
  /** 重试按钮文案 */
  retryLabel?: string;
  /** 是否禁用重试 */
  disabled?: boolean;
  /** 是否撑满剩余空间 */
  fill?: boolean;
  /** 最小高度，fill 为真时忽略 */
  minHeight?: string;
};

type TStatePanelEmits = {
  /** 请求重试 */
  retry: [];
};

const props = withDefaults(defineProps<TStatePanelProps>(), {
  disabled: false,
  fill: false,
  retryLabel: "重新加载",
  minHeight: "160px",
});
const emits = defineEmits<TStatePanelEmits>();

const role = computed<string>(() => (props.variant === "error" ? "alert" : "status"));
const liveMode = computed<"polite" | "assertive" | undefined>(() => {
  if (props.variant === "loading") return "polite";
  if (props.variant === "error") return "assertive";
  return undefined;
});
const iconValue = computed<string>(() => {
  if (props.icon) return props.icon;
  return props.variant === "error" ? "mdi-alert-circle-outline" : "mdi-information-outline";
});
const panelStyle = computed<Record<string, string>>(() => {
  return { minHeight: props.fill ? "0" : props.minHeight };
});
</script>

<style lang="scss" scoped>
.tsp {
  display: flex;
  min-height: 160px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  color: var(--box-text-4);
  gap: 8px;
  text-align: center;

  &.is-fill {
    flex: 1 1 auto;
  }

  p {
    margin: 0;
    overflow-wrap: anywhere;
  }
}
</style>
