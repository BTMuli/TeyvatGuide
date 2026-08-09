<!-- 角色/武器图鉴统一布局 -->
<template>
  <div class="twg-shell">
    <aside class="twg-browser">
      <header class="twg-toolbar">
        <div class="twg-heading">
          <div class="twg-title-row">
            <v-icon class="twg-title-icon" size="20">{{ props.icon }}</v-icon>
            <h1>{{ props.title }}</h1>
          </div>
          <span class="twg-count">{{ props.count }} {{ props.unit }}</span>
        </div>
        <div class="twg-actions">
          <v-text-field
            v-model="search"
            :placeholder="props.searchPlaceholder"
            aria-label="按名称搜索"
            class="twg-search"
            clearable
            density="compact"
            hide-details
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
          />
          <v-btn
            class="twg-filter-btn"
            density="comfortable"
            prepend-icon="mdi-tune-variant"
            variant="flat"
            @click="emits('filter')"
          >
            筛选
          </v-btn>
          <v-btn
            class="twg-reset-btn"
            density="comfortable"
            prepend-icon="mdi-restore"
            variant="text"
            @click="emits('reset')"
          >
            重置
          </v-btn>
        </div>
      </header>
      <div class="twg-list">
        <div v-if="props.count === 0" class="twg-empty">
          <v-icon icon="mdi-text-search" size="24" />
          <span>未找到名称匹配的内容</span>
        </div>
        <slot v-else name="list" />
      </div>
    </aside>
    <main class="twg-detail">
      <slot />
    </main>
  </div>
</template>
<script lang="ts" setup>
type TwgCatalogProps = {
  count: number;
  icon: string;
  title: string;
  unit: string;
  searchPlaceholder?: string;
};
type TwgCatalogEmits = {
  filter: [];
  reset: [];
};

const props = withDefaults(defineProps<TwgCatalogProps>(), {
  searchPlaceholder: "搜索名称",
});
const emits = defineEmits<TwgCatalogEmits>();
const search = defineModel<string | null>("search", { required: true });
</script>
<style lang="scss" scoped>
.twg-shell {
  position: relative;
  display: flex;
  height: calc(100vh - 32px);
  min-height: 0;
  column-gap: 12px;
}

.twg-browser {
  position: relative;
  display: flex;
  min-width: 0;
  flex: 0 0 38%;
  flex-direction: column;
  gap: 8px;
}

.twg-toolbar {
  display: flex;
  min-height: 56px;
  align-items: center;
  justify-content: space-between;
  padding: 8px 8px 8px 12px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 8px;
  background: var(--box-bg-1);
  gap: 12px;
}

.twg-heading {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.twg-title-row {
  display: flex;
  min-width: 0;
  align-items: center;
  column-gap: 8px;

  h1 {
    overflow: hidden;
    margin: 0;
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 20px;
    font-weight: normal;
    line-height: 26px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.twg-title-icon {
  color: var(--tgc-yellow-1);
}

.twg-count {
  color: var(--box-text-4);
  font-size: 12px;
  line-height: 16px;
}

.twg-actions {
  display: flex;
  min-width: 0;
  flex-shrink: 0;
  align-items: center;
  column-gap: 4px;
}

.twg-search {
  width: 148px;
  flex: 0 1 148px;

  :deep(.v-field) {
    border-radius: 4px;
    color: var(--box-text-2);
    font-size: 12px;
  }
}

.twg-filter-btn,
.twg-reset-btn {
  border-radius: 4px;
  font-family: var(--font-text);
}

.twg-filter-btn {
  background: var(--tgc-btn-1);
  color: var(--btn-text);
}

.twg-reset-btn {
  color: var(--box-text-2);
}

.twg-list {
  position: relative;
  display: grid;
  overflow: hidden auto;
  width: 100%;
  min-height: 0;
  gap: 8px;
  grid-auto-rows: max-content;
  grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
}

.twg-empty {
  display: flex;
  min-height: 120px;
  align-items: center;
  justify-content: center;
  border: 1px dashed var(--common-shadow-1);
  border-radius: 8px;
  color: var(--box-text-4);
  font-size: 13px;
  gap: 8px;
  grid-column: 1 / -1;
}

.twg-detail {
  position: relative;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  padding: 12px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 8px;
  background: var(--app-page-bg);
  box-shadow: 0 2px 8px var(--common-shadow-t-2);
  overflow-y: auto;
}

@media (width <= 1100px) {
  .twg-toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
  }

  .twg-heading {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  .twg-actions {
    width: 100%;
  }

  .twg-search {
    width: auto;
    flex: 1;
  }
}
</style>
