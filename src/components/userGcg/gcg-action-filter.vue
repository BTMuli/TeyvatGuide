<template>
  <v-btn
    :aria-expanded="visible"
    :aria-label="hasFilters ? '筛选行动牌，已启用筛选' : '筛选行动牌'"
    :variant="hasFilters ? 'tonal' : 'outlined'"
    aria-haspopup="dialog"
    class="gcg-filter-trigger"
    color="var(--tgc-od-blue)"
    icon="mdi-filter-variant"
    title="筛选行动牌"
    type="button"
    @click="openFilters"
  />

  <Teleport to="body">
    <TwfFilterShell
      v-model="visible"
      :showFooterHint="false"
      title="行动牌筛选"
      topOffset="var(--v-layout-top, 0px)"
      @confirm="applyFilters"
    >
      <div class="twf-grid">
        <section v-for="group in groups" :key="group.key" class="twf-group twf-group-wide">
          <h3 :id="`${groupId}-${group.key}`" class="twf-group-title gcg-filter-label">
            {{ group.label }}
          </h3>
          <div :aria-labelledby="`${groupId}-${group.key}`" class="gcg-filter-options" role="group">
            <button
              :aria-pressed="draft[group.key] === null"
              :class="{ selected: draft[group.key] === null }"
              class="gcg-filter-option"
              type="button"
              @click="draft[group.key] = null"
            >
              不限
            </button>
            <button
              v-for="option in group.options"
              :key="option.id"
              :aria-pressed="draft[group.key] === option.id"
              :class="{ selected: draft[group.key] === option.id }"
              class="gcg-filter-option"
              type="button"
              @click="toggleFilter(group.key, option.id)"
            >
              {{ option.name }}
            </button>
          </div>
        </section>
      </div>
      <template #footer>
        <v-btn type="button" variant="text" @click="resetFilters">重置</v-btn>
        <v-btn prepend-icon="mdi-check" type="button" variant="flat" @click="applyFilters">
          应用
        </v-btn>
      </template>
    </TwfFilterShell>
  </Teleport>
</template>

<script lang="ts" setup>
import TwfFilterShell from "@comp/pageWiki/twf-filter-shell.vue";
import { computed, ref, useId } from "vue";

type GcgActionFilterKey = "actionType" | "actionTag" | "actionCost";
type GcgActionFilterGroup = {
  key: GcgActionFilterKey;
  label: string;
  options: Array<TGApp.Game.CardSquare.FilterOption>;
};

const { filters } = defineProps<{ filters: TGApp.Game.CardSquare.Filters }>();
const selection = defineModel<TGApp.Game.CardSquare.CatalogSelection>({ required: true });
const visible = ref<boolean>(false);
const groupId = useId();
const draft = ref<
  Pick<TGApp.Game.CardSquare.CatalogSelection, "actionType" | "actionTag" | "actionCost">
>({ actionType: null, actionTag: null, actionCost: null });
const groups = computed<Array<GcgActionFilterGroup>>(() => [
  { key: "actionType", label: "类型", options: filters.action_type },
  { key: "actionTag", label: "标签", options: filters.action_tag },
  { key: "actionCost", label: "花费", options: filters.action_cost },
]);
const hasFilters = computed<boolean>(
  () =>
    selection.value.actionType !== null ||
    selection.value.actionTag !== null ||
    selection.value.actionCost !== null,
);

function openFilters(): void {
  draft.value = {
    actionType: selection.value.actionType,
    actionTag: selection.value.actionTag,
    actionCost: selection.value.actionCost,
  };
  visible.value = true;
}

function resetFilters(): void {
  draft.value = { actionType: null, actionTag: null, actionCost: null };
}

function toggleFilter(key: GcgActionFilterKey, value: number): void {
  draft.value[key] = draft.value[key] === value ? null : value;
}

function applyFilters(): void {
  selection.value = { ...selection.value, ...draft.value };
  visible.value = false;
}
</script>

<style lang="scss" scoped>
.gcg-filter-trigger {
  width: 44px;
  height: 40px;
  border-radius: 4px;
}

.gcg-filter-label {
  margin: 0;
}

.gcg-filter-options {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: 8px;
  grid-column: 1 / -1;
}

.gcg-filter-option {
  min-height: 32px;
  padding: 4px 12px;
  border: 1px solid color-mix(in srgb, var(--tgc-od-blue) 30%, transparent);
  border-radius: 4px;
  background: color-mix(in srgb, var(--tgc-od-blue) 18%, transparent);
  color: var(--box-text-2);
  cursor: pointer;
  font-family: var(--font-text);
  font-size: 14px;
  line-height: 20px;

  &:hover {
    border-color: var(--common-text-title);
  }

  &.selected {
    border-color: var(--common-text-title);
    background: var(--tgc-btn-1);
    color: var(--btn-text);
  }
}
</style>
