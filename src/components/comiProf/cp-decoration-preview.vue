<!-- 头像框与评论装扮的预览信息 -->
<template>
  <div :class="{ 'has-bubble': props.bubble }" class="cpdp-preview">
    <slot name="visual" />
    <div class="cpdp-copy">
      <div class="cpdp-title">
        <h3>{{ props.title }}</h3>
        <span v-if="props.inUse" class="cpdp-badge is-in-use">使用中</span>
        <span v-if="props.limited" class="cpdp-badge">限时</span>
        <span v-if="props.locked" class="cpdp-badge is-locked">未拥有</span>
      </div>
      <p v-if="props.description">{{ props.description }}</p>
      <p v-else class="cpdp-placeholder">{{ props.placeholder }}</p>
      <p v-if="props.author" class="cpdp-author">绘制者：{{ props.author }}</p>
      <p v-if="props.limited" class="cpdp-limit">{{ props.limitText }}</p>
      <p v-for="warning in props.warnings" :key="warning" class="cpdp-warning">
        {{ warning }}
      </p>
    </div>
  </div>
</template>

<script lang="ts" setup>
/**
 * 装扮预览参数。
 * @since Beta v0.13.1
 */
type DecorationPreviewProps = {
  /** 当前装扮名称 */
  title: string;
  /** 装扮描述 */
  description?: string;
  /** 绘制者 */
  author?: string;
  /** 是否使用中 */
  inUse: boolean;
  /** 是否限时 */
  limited: boolean;
  /** 限时说明 */
  limitText?: string;
  /** 是否未拥有 */
  locked: boolean;
  /** 警示文案 */
  warnings: Array<string>;
  /** 无描述时的占位文案 */
  placeholder: string;
  /** 是否为评论气泡布局 */
  bubble: boolean;
};

const props = defineProps<DecorationPreviewProps>();
</script>

<style lang="scss" scoped>
.cpdp-preview {
  position: relative;
  display: flex;
  flex: none;
  align-items: center;
  padding: 16px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-2);
  gap: 16px;

  &.has-bubble {
    overflow: hidden;
    align-items: flex-start;
  }
}

.cpdp-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;

  p {
    margin: 0;
    color: var(--box-text-4);
    font-size: 12px;
    line-height: 18px;
    overflow-wrap: anywhere;
  }

  .cpdp-limit,
  .cpdp-warning {
    color: var(--common-text-title);
  }
}

.has-bubble .cpdp-copy {
  max-width: 55%;
}

.cpdp-title {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;

  h3 {
    margin: 0;
    color: var(--common-text-title);
    font-size: 16px;
    font-weight: 500;
    overflow-wrap: anywhere;
  }
}

.cpdp-badge {
  flex: none;
  padding: 0 6px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 2px;
  color: var(--box-text-4);
  font-size: 11px;
  line-height: 18px;

  &.is-locked {
    color: var(--common-text-title);
  }

  &.is-in-use {
    border-color: var(--common-text-title);
    color: var(--common-text-title);
  }
}

@media (width <= 640px) {
  .cpdp-preview {
    align-items: flex-start;
    padding: 12px;
  }

  .has-bubble .cpdp-copy {
    max-width: 60%;
  }
}
</style>
