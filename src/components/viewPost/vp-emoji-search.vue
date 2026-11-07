<!-- 帖子与回复共用的表情搜索栏 -->
<template>
  <v-text-field
    :disabled="disabled"
    :model-value="modelValue"
    aria-label="搜索表情"
    autocomplete="off"
    class="emoji-search"
    clearable
    density="compact"
    hide-details
    placeholder="搜索表情"
    prepend-inner-icon="mdi-magnify"
    type="search"
    variant="outlined"
    @update:model-value="handleUpdate"
  />
</template>
<script lang="ts" setup>
const { disabled = false } = defineProps<{ disabled?: boolean }>();
const modelValue = defineModel<string>({ default: "" });

/**
 * 将输入框清空时的 null 归一为空字符串。
 * @since Beta v0.13.0
 * @param value - 输入框更新的值
 */
function handleUpdate(value: string | null): void {
  modelValue.value = value ?? "";
}
</script>
<style lang="scss" scoped>
.emoji-search {
  width: 100%;
  min-width: 0;

  &.v-input--density-compact {
    --v-input-control-height: 32px;
  }

  :deep(.v-field) {
    --v-input-padding-top: 0;
    --v-field-padding-bottom: 0;

    min-height: 32px;
    font-size: 14px;
  }

  :deep(.v-field__input) {
    min-height: 32px;
  }

  :deep(.v-field__prepend-inner > .v-icon),
  :deep(.v-field__clearable > .v-icon) {
    font-size: 18px;
  }
}
</style>
