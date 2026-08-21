<!-- 图鉴筛选统一浮窗 -->
<template>
  <TopOverlay
    v-model="visible"
    closeAriaLabel="关闭筛选"
    contentMaxHeight="none"
    panelMaxHeight="calc(100vh - 64px)"
    panelWidth="min(720px, calc(100vw - 64px))"
    :showShare="false"
    :titleId
    :topOffset="props.topOffset"
  >
    <template #header>
      <div class="twf-header-icon">
        <v-icon size="22">mdi-tune-variant</v-icon>
      </div>
      <div class="twf-heading">
        <h2 :id="titleId">{{ props.title }}</h2>
        <p>{{ props.description }}</p>
      </div>
    </template>

    <div class="twf-content">
      <slot />
    </div>

    <template #footer>
      <span class="twf-footer-hint">未选择或全选均表示不限</span>
      <div class="twf-actions">
        <v-btn class="twf-cancel" variant="text" @click="visible = false">取消</v-btn>
        <v-btn
          class="twf-confirm"
          prepend-icon="mdi-check"
          variant="flat"
          @click="emits('confirm')"
        >
          应用筛选
        </v-btn>
      </div>
    </template>
  </TopOverlay>
</template>
<script lang="ts" setup>
import TopOverlay from "@comp/app/top-overlay.vue";
import { useId } from "vue";

type TwfFilterShellProps = {
  description: string;
  title: string;
  topOffset?: string;
};
type TwfFilterShellEmits = { confirm: [] };

const props = defineProps<TwfFilterShellProps>();
const emits = defineEmits<TwfFilterShellEmits>();
const visible = defineModel<boolean>({ default: false });
const titleId = useId();
</script>
<style lang="scss" scoped>
.twf-header-icon {
  display: flex;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: var(--tgc-btn-1);
  color: var(--btn-text);
}

.twf-heading {
  min-width: 0;
  flex: 1;

  h2 {
    margin: 0;
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 20px;
    font-weight: normal;
    line-height: 26px;
  }

  p {
    margin: 2px 0 0;
    color: var(--box-text-4);
    font-size: 12px;
    line-height: 16px;
  }
}

.twf-content {
  :deep(.twf-grid) {
    display: grid;
    gap: 12px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  :deep(.twf-grid-3) {
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  }

  :deep(.twf-group) {
    display: grid;
    min-width: 0;
    align-content: start;
    align-items: center;
    padding: 12px;
    border: 1px solid var(--common-shadow-1);
    border-radius: 8px;
    background: var(--box-bg-1);
    gap: 8px;
    grid-template-columns: minmax(0, 1fr) auto;
  }

  :deep(.twf-group-wide) {
    grid-column: 1 / -1;
  }

  :deep(.twf-group-title) {
    color: var(--common-text-title);
    font-size: 14px;
    font-weight: 600;
    grid-column: 1;
    grid-row: 1;
    line-height: 20px;
  }

  :deep(.twf-options) {
    display: contents;
  }

  :deep(.uav-select-chips-box) {
    display: contents;
  }

  :deep(.uav-scb-actions) {
    flex-shrink: 0;
    grid-column: 2;
    grid-row: 1;
    justify-self: end;
  }

  :deep(.uav-scb-all),
  :deep(.uav-scb-invert) {
    border-radius: 4px;
  }

  :deep(.uav-scb-group) {
    overflow: visible;
    width: 100%;
    min-width: 0;
    flex: 1 1 auto;
    grid-column: 1 / -1;
    grid-row: 2;
  }

  :deep(.v-slide-group__container) {
    overflow: visible;
    width: 100%;
    min-width: 0;
  }

  :deep(.v-slide-group__content) {
    width: 100%;
    min-width: 0;
    flex: 1 1 auto;
    flex-wrap: wrap;
    gap: 8px;
    transition: none;
    white-space: normal;
  }

  :deep(.v-slide-group__next),
  :deep(.v-slide-group__prev) {
    display: none;
  }

  :deep(.uav-scb-item) {
    border-radius: 4px;
    margin: 0;
  }

  :deep(.twf-group-weapon .uav-scb-inner img) {
    filter: var(--icon-filter);
  }
}

.twf-footer-hint {
  color: var(--box-text-4);
  font-size: 12px;
  line-height: 16px;
  opacity: 0.72;
}

.twf-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  column-gap: 8px;
}

.twf-cancel,
.twf-confirm {
  border-radius: 4px;
  font-family: var(--font-text);
}

.twf-cancel {
  color: var(--box-text-2);
}

.twf-confirm {
  background: var(--tgc-btn-1);
  color: var(--btn-text);
}
</style>
