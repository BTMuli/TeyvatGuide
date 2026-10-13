<!-- 养成材料来源与消耗的统一列表 -->
<template>
  <section v-if="items.length > 0" :class="{ collapsible }" class="ucmcl-section">
    <header v-if="!collapsible" class="ucmcl-heading">
      <v-icon :color="iconColor" size="18">{{ icon }}</v-icon>
      <h3>{{ title }}</h3>
      <span class="ucmcl-count">
        {{ items.length }} 种<span v-if="missingKinds > 0" class="ucmcl-shortage">
          · 缺 {{ missingKinds }} 种</span
        >
      </span>
    </header>
    <button
      v-if="collapsible"
      :aria-controls="contentId"
      :aria-expanded="expanded"
      class="ucmcl-toggle"
      type="button"
      @click="expanded = !expanded"
      @pointerdown.stop
    >
      <span class="ucmcl-heading">
        <v-icon :color="iconColor" size="18">{{ icon }}</v-icon>
        <span class="ucmcl-toggle-title">{{ title }}</span>
        <span class="ucmcl-count">
          {{ items.length }} 种<span v-if="missingKinds > 0" class="ucmcl-shortage">
            · 缺 {{ missingKinds }} 种</span
          >
        </span>
      </span>
      <v-icon :icon="expanded ? 'mdi-chevron-down' : 'mdi-chevron-up'" size="20" />
    </button>
    <Transition name="ucmcl-content">
      <div
        v-show="!collapsible || expanded"
        :id="collapsible ? contentId : undefined"
        class="ucmcl-content"
      >
        <div class="ucmcl-content-viewport">
          <div class="ucmcl-list">
            <UcMaterialReq
              v-for="material in displayItems"
              :key="material.id"
              :description="material.role"
              :interactive="false"
              :material
            />
          </div>
        </div>
      </div>
    </Transition>
  </section>
</template>

<script lang="ts" setup>
import UcMaterialReq from "@comp/userCalc/uc-material-req.vue";
import { computed, ref, useId } from "vue";

type UcMaterialCostListItem = Pick<
  TGApp.App.UserCalc.CraftingCost,
  "id" | "name" | "type" | "star" | "count" | "owned"
> & {
  role?: string;
  missing?: number;
};

type UcMaterialCostListDisplayItem = TGApp.App.UserCalc.ResultMaterial & {
  role?: string;
};

type UcMaterialCostListProps = {
  title: string;
  items: ReadonlyArray<UcMaterialCostListItem>;
  icon: string;
  iconColor: string;
  collapsible?: boolean;
};

const {
  title,
  items,
  icon,
  iconColor,
  collapsible = false,
} = defineProps<UcMaterialCostListProps>();
const contentId = useId();
const expanded = ref<boolean>(false);
const displayItems = computed<Array<UcMaterialCostListDisplayItem>>(() =>
  items.map((item) => {
    const required = item.count;
    const owned = item.owned;
    const missing = item.missing ?? Math.max(required - owned, 0);
    const progress = required === 0 ? 100 : Math.min(Math.max((owned / required) * 100, 0), 100);
    return {
      id: item.id,
      name: item.name,
      type: item.type,
      star: item.star,
      required,
      owned,
      craftable: 0,
      craftingCosts: [],
      missing,
      progress,
      role: item.role,
    };
  }),
);
const missingKinds = computed<number>(
  () => displayItems.value.filter((item) => item.missing > 0).length,
);
</script>

<style lang="scss" scoped>
.ucmcl-section {
  display: flex;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
  flex-direction: column;
  flex-shrink: 0;
  padding: 12px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 8px;
  background: var(--box-bg-2);
  color: var(--box-text-1);
  gap: 8px;
}

.ucmcl-section.collapsible {
  overflow: hidden;
  padding: 0;
  gap: 0;
}

.ucmcl-content {
  min-width: 0;
}

.ucmcl-section.collapsible .ucmcl-content {
  display: grid;
  min-height: 0;
  grid-template-rows: 1fr;
}

.ucmcl-section.collapsible .ucmcl-content-viewport {
  min-height: 0;
  max-height: min(360px, 50vh);
  overflow-y: auto;
}

.ucmcl-section.collapsible .ucmcl-content.ucmcl-content-enter-active,
.ucmcl-section.collapsible .ucmcl-content.ucmcl-content-leave-active {
  overflow: hidden;
  transition: grid-template-rows 180ms ease;
}

.ucmcl-section.collapsible .ucmcl-content.ucmcl-content-enter-from,
.ucmcl-section.collapsible .ucmcl-content.ucmcl-content-leave-to {
  grid-template-rows: 0fr;
}

.ucmcl-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  color: var(--common-text-sub);
  gap: 8px;

  h3,
  .ucmcl-toggle-title {
    margin: 0;
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 16px;
    font-weight: normal;
    line-height: 22px;
  }
}

.ucmcl-count {
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  line-height: 16px;
}

.ucmcl-toggle {
  display: flex;
  width: 100%;
  min-height: 44px;
  box-sizing: border-box;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border: 0;
  border-radius: inherit;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  gap: 8px;
  text-align: left;

  &:hover {
    background: var(--common-shadow-t-1);
  }

  &:focus-visible {
    outline: 2px solid var(--tgc-od-blue);
    outline-offset: -2px;
  }

  > .ucmcl-heading {
    min-width: 0;
    flex: 1;
  }
}

.ucmcl-list {
  display: grid;
  width: 100%;
  min-width: 0;
  gap: 8px;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr));
}

.ucmcl-shortage {
  color: var(--tgc-od-red);
  font-weight: 600;
}

@media (width <= 600px) {
  .ucmcl-list {
    grid-template-columns: minmax(0, 1fr);
  }
}

.ucmcl-section.collapsible .ucmcl-list {
  padding: 12px;
}

@media (prefers-reduced-motion: reduce) {
  .ucmcl-section.collapsible .ucmcl-content.ucmcl-content-enter-active,
  .ucmcl-section.collapsible .ucmcl-content.ucmcl-content-leave-active {
    transition-duration: 0.01ms;
  }
}
</style>
