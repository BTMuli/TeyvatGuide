<!-- 背包合并视图工作台通用布局 -->
<template>
  <div class="pb-bws" @keydown.esc="groupsOpen = false">
    <button
      v-if="groupsOpen"
      aria-label="关闭分组列表"
      class="pb-bws-scrim"
      type="button"
      @click="groupsOpen = false"
    />
    <aside
      :aria-labelledby="props.groupsTitleId"
      :class="{ open: groupsOpen }"
      class="pb-bws-groups"
    >
      <button
        v-if="!groupsOpen"
        aria-label="打开分组列表"
        class="pb-bws-rail-btn"
        title="打开分组列表"
        type="button"
        @click="groupsOpen = true"
      >
        <v-icon>mdi-format-list-bulleted</v-icon>
      </button>
      <div class="pb-bws-header pb-bws-groups-header">
        <slot name="groups-header" />
        <button
          aria-label="收起分组列表"
          class="pb-bws-close-groups"
          title="收起分组列表"
          type="button"
          @click="groupsOpen = false"
        >
          <v-icon size="20">mdi-chevron-left</v-icon>
        </button>
      </div>
      <div class="pb-bws-scroll"><slot name="groups" /></div>
    </aside>

    <main :aria-labelledby="props.itemsTitleId" class="pb-bws-items">
      <div class="pb-bws-header pb-bws-items-header">
        <button
          :aria-expanded="groupsOpen"
          aria-label="打开分组列表"
          class="pb-bws-mobile-groups"
          title="打开分组列表"
          type="button"
          @click="groupsOpen = true"
        >
          <v-icon size="20">mdi-format-list-bulleted</v-icon>
        </button>
        <slot name="items-header" />
      </div>
      <div class="pb-bws-scroll"><slot name="items" /></div>
    </main>

    <aside
      :aria-labelledby="props.detailTitleId"
      :class="{ open: props.detailOpen }"
      class="pb-bws-detail"
    >
      <div class="pb-bws-header"><slot name="detail-header" /></div>
      <div class="pb-bws-scroll"><slot name="detail" /></div>
    </aside>
  </div>
</template>

<script lang="ts" setup>
type PbBagWorkspaceShellProps = {
  groupsTitleId: string;
  itemsTitleId: string;
  detailTitleId: string;
  detailOpen: boolean;
};

const props = defineProps<PbBagWorkspaceShellProps>();
const groupsOpen = defineModel<boolean>("groupsOpen", { required: true });
</script>

<style lang="scss" scoped>
.pb-bws {
  --bag-surface: var(--app-page-bg);
  --bag-surface-subtle: var(--box-bg-1);
  --bag-surface-hover: var(--box-bg-4);
  --bag-surface-selected: color-mix(in srgb, var(--tgc-yellow-3) 12%, var(--bag-surface));
  --bag-stroke: var(--common-shadow-1);
  --bag-stroke-strong: var(--common-shadow-2);
  --bag-text-secondary: var(--box-text-4);
  --bag-accent: var(--tgc-yellow-3);
  --bag-accent-text: var(--common-text-title);
  --bag-scrim: var(--common-shadow-4);

  position: relative;
  display: grid;
  overflow: hidden;
  width: calc(100% - 24px);

  /* 预留 app-container 的 32px 纵向内边距与工作台自身的 24px 外边距。 */
  height: calc(100dvh - var(--v-layout-top, 0px) - 56px);
  min-height: 360px;
  box-sizing: border-box;
  margin: 12px;
  background: transparent;
  color: var(--app-page-content);
  gap: 12px;
  grid-template-columns:
    clamp(240px, 22vw, 280px) minmax(300px, 1fr)
    clamp(320px, 28vw, 376px);
}

.pb-bws-groups,
.pb-bws-items,
.pb-bws-detail {
  position: relative;
  z-index: 1;
  display: flex;
  overflow: hidden;
  min-width: 0;
  flex-direction: column;
  border: 1px solid var(--bag-stroke);
  border-radius: 8px;
  background: var(--bag-surface);
}

.pb-bws-groups {
  background: var(--bag-surface-subtle);
}

.pb-bws-items {
  grid-column: 2;
}

.pb-bws-detail {
  grid-column: 3;
}

.pb-bws-header {
  display: flex;
  min-height: 72px;
  box-sizing: border-box;
  flex: none;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid var(--bag-stroke);
  gap: 8px;
}

.pb-bws-groups-header {
  justify-content: space-between;
  gap: 8px;
}

.pb-bws-scroll {
  overflow: auto;
  min-height: 0;
  flex: 1;
  overscroll-behavior: contain;
}

.pb-bws-rail-btn,
.pb-bws-close-groups,
.pb-bws-mobile-groups {
  display: none;
  width: 40px;
  height: 40px;
  flex: none;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--app-page-content);
  cursor: pointer;
}

.pb-bws-rail-btn:hover,
.pb-bws-close-groups:hover,
.pb-bws-mobile-groups:hover {
  background: var(--bag-surface-hover);
}

.pb-bws-rail-btn:focus-visible,
.pb-bws-close-groups:focus-visible,
.pb-bws-mobile-groups:focus-visible {
  outline: 2px solid var(--bag-accent);
  outline-offset: -2px;
}

.pb-bws-scrim {
  display: none;
}

@media (width <= 1179px) {
  .pb-bws {
    gap: 8px;
    grid-template-columns: 48px minmax(260px, 1fr) clamp(300px, 34vw, 376px);
  }

  .pb-bws-groups {
    z-index: 4;
    width: 48px;
    transition: width 140ms ease;

    &:not(.open) {
      .pb-bws-header,
      .pb-bws-scroll {
        display: none;
      }
    }

    &.open {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      width: min(320px, 100%);
      border-right: 1px solid var(--bag-stroke-strong);
      box-shadow: 8px 0 24px var(--common-shadow-2);
    }
  }

  .pb-bws-rail-btn,
  .pb-bws-close-groups {
    display: flex;
  }

  .pb-bws-rail-btn {
    margin: 12px 3px;
  }

  .pb-bws-scrim {
    position: absolute;
    z-index: 3;
    display: block;
    border: 0;
    background: var(--bag-scrim);
    inset: 0;
  }
}

@media (width <= 839px) {
  .pb-bws {
    display: block;
  }

  .pb-bws-groups {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;

    &:not(.open) {
      display: none;
    }
  }

  .pb-bws-mobile-groups {
    display: flex;
  }

  .pb-bws-items {
    width: 100%;
    height: 100%;
  }

  .pb-bws-detail {
    position: absolute;
    z-index: 5;
    display: none;
    inset: 0;

    &.open {
      display: flex;
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .pb-bws-groups {
    transition: none;
  }
}
</style>
