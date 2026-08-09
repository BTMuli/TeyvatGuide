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
        <slot name="list" />
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
};
type TwgCatalogEmits = {
  filter: [];
  reset: [];
};

const props = defineProps<TwgCatalogProps>();
const emits = defineEmits<TwgCatalogEmits>();
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
  flex-shrink: 0;
  align-items: center;
  column-gap: 4px;
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
  padding-right: 8px;
  gap: 8px;
  grid-auto-rows: max-content;
  grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
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
</style>
