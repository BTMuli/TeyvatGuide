<!-- 头像选择项 -->
<template>
  <button
    :aria-label="props.ariaLabel"
    :aria-pressed="props.selected"
    :class="{ 'is-selected': props.selected }"
    class="cpao-avatar"
    :disabled="props.disabled"
    :title="props.name"
    type="button"
    @click="emits('select')"
  >
    <img :alt="props.name" decoding="async" loading="lazy" :src="props.src" />
    <span v-if="props.selected" aria-hidden="true" class="cpao-check">
      <v-icon size="14">mdi-check</v-icon>
    </span>
  </button>
</template>

<script lang="ts" setup>
/**
 * 头像选择项参数。
 * @since Beta v0.13.1
 */
type AvatarOptionProps = {
  /** 头像图片链接 */
  src: string;
  /** 头像名称 */
  name: string;
  /** 无障碍标签 */
  ariaLabel: string;
  /** 是否选中 */
  selected: boolean;
  /** 是否禁用 */
  disabled?: boolean;
};

type AvatarOptionEmits = {
  /** 选择当前头像 */
  select: [];
};

const props = withDefaults(defineProps<AvatarOptionProps>(), {
  disabled: false,
});
const emits = defineEmits<AvatarOptionEmits>();
</script>

<style lang="scss" scoped>
.cpao-avatar {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border: 2px solid transparent;
  border-radius: 50%;
  margin: 0;
  aspect-ratio: 1;
  background: var(--box-bg-2);
  cursor: pointer;
  transition:
    border-color 120ms ease,
    background-color 120ms ease;

  img {
    display: block;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
  }

  &:hover {
    border-color: var(--common-shadow-2);
    background: var(--box-bg-3);
  }

  &:focus-visible {
    outline: 2px solid var(--common-text-title);
    outline-offset: 2px;
  }

  &.is-selected {
    border-color: var(--common-text-title);
    background: var(--box-bg-3);
  }
}

.cpao-check {
  position: absolute;
  right: -2px;
  bottom: -2px;
  display: flex;
  width: 20px;
  height: 20px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--common-text-title);
  color: var(--box-bg-1);
}
</style>
