<!-- 图鉴筛选统一浮窗 -->
<template>
  <TOverlay v-model="visible">
    <section :aria-labelledby="titleId" aria-modal="true" class="twf-shell" role="dialog">
      <header class="twf-header">
        <div class="twf-header-icon">
          <v-icon size="22">mdi-tune-variant</v-icon>
        </div>
        <div class="twf-heading">
          <h2 :id="titleId">{{ props.title }}</h2>
          <p>{{ props.description }}</p>
        </div>
        <v-btn
          aria-label="关闭筛选"
          class="twf-close"
          density="comfortable"
          icon="mdi-close"
          title="关闭筛选"
          variant="text"
          @click="visible = false"
        />
      </header>
      <div class="twf-content">
        <slot />
      </div>
      <footer class="twf-footer">
        <span>未选择或全选均表示不限</span>
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
      </footer>
    </section>
  </TOverlay>
</template>
<script lang="ts" setup>
import TOverlay from "@comp/app/t-overlay.vue";
import { useId } from "vue";

type TwfFilterShellProps = {
  description: string;
  title: string;
};
type TwfFilterShellEmits = { confirm: [] };

const props = defineProps<TwfFilterShellProps>();
const emits = defineEmits<TwfFilterShellEmits>();
const visible = defineModel<boolean>({ default: false });
const titleId = useId();
</script>
<style lang="scss" scoped>
.twf-shell {
  display: flex;
  overflow: hidden;
  width: min(720px, calc(100vw - 64px));
  max-height: calc(100vh - 64px);
  flex-direction: column;
  border: 1px solid var(--common-shadow-2);
  border-radius: 12px;
  background: var(--app-page-bg);
  box-shadow: 0 8px 24px var(--common-shadow-t-4);
}

.twf-header {
  display: flex;
  align-items: center;
  padding: 16px 16px 12px;
  border-bottom: 1px solid var(--common-shadow-1);
  background: var(--dialog-header-bg);
  gap: 12px;
}

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

.twf-close {
  flex-shrink: 0;
  border-radius: 4px;
  color: var(--box-text-2);
}

.twf-content {
  padding: 16px;
  overflow-y: auto;

  :deep(.twf-grid) {
    display: grid;
    gap: 12px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  :deep(.twf-grid-3) {
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  }

  :deep(.twf-group) {
    display: flex;
    min-width: 0;
    flex-direction: column;
    padding: 12px;
    border: 1px solid var(--common-shadow-1);
    border-radius: 8px;
    background: var(--box-bg-1);
    gap: 8px;
  }

  :deep(.twf-group-wide) {
    grid-column: 1 / -1;
  }

  :deep(.twf-group-title) {
    color: var(--common-text-title);
    font-size: 14px;
    font-weight: 600;
    line-height: 20px;
  }

  :deep(.twf-options) {
    overflow: visible;
    min-width: 0;
  }

  :deep(.uav-select-chips-box) {
    width: 100%;
    align-items: flex-start;
    gap: 8px;
  }

  :deep(.uav-scb-all) {
    flex-shrink: 0;
    border-radius: 4px;
  }

  :deep(.uav-scb-group) {
    overflow: visible;
    width: 100%;
    min-width: 0;
    flex: 1 1 auto;
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

.twf-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-top: 1px solid var(--common-shadow-1);
  background: var(--dialog-footer-bg);
  gap: 16px;

  > span {
    color: var(--box-text-4);
    font-size: 12px;
    line-height: 16px;
    opacity: 0.72;
  }
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
