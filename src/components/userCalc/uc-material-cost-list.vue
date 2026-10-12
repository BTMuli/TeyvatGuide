<!-- 养成材料来源与消耗的统一列表 -->
<template>
  <section v-if="items.length > 0" class="ucmcl-section">
    <header class="ucmcl-heading">
      <v-icon :color="iconColor" size="18">{{ icon }}</v-icon>
      <h3>{{ title }}</h3>
      <span>
        {{ items.length }} 种<span v-if="missingKinds > 0" class="ucmcl-shortage">
          · 缺 {{ missingKinds }} 种</span
        >
      </span>
    </header>
    <div class="ucmcl-list">
      <article
        v-for="item in items"
        :key="item.id"
        :class="{ missing: (item.missing ?? 0) > 0 }"
        class="ucmcl-row"
      >
        <UcItemIcon
          :alt="item.name"
          :icon="'/icon/material/' + item.id + '.webp'"
          :size="36"
          :star="item.star"
        />
        <div class="ucmcl-info">
          <div class="ucmcl-name-row">
            <strong :title="item.name">{{ item.name }}</strong>
            <span v-if="item.role" class="ucmcl-role">{{ item.role }}</span>
          </div>
          <div class="ucmcl-stats">
            <span :title="showAvailable ? undefined : '背包持有 ' + fmtUtil.num(item.owned)"
              >{{ quantityLabel }} {{ fmtUtil.num(item.count) }}</span
            >
            <span v-if="showAvailable">可用 {{ fmtUtil.num(item.owned) }}</span>
            <span v-if="(item.missing ?? 0) > 0" class="ucmcl-shortage">
              缺 {{ fmtUtil.num(item.missing ?? 0) }}
            </span>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<script lang="ts" setup>
import UcItemIcon from "@comp/userCalc/uc-item-icon.vue";
import fmtUtil from "@utils/fmtUtil.js";
import { computed } from "vue";

type UcMaterialCostListItem = Pick<
  TGApp.App.UserCalc.CraftingCost,
  "id" | "name" | "star" | "count" | "owned"
> & {
  role?: string;
  missing?: number;
};

type UcMaterialCostListProps = {
  title: string;
  items: ReadonlyArray<UcMaterialCostListItem>;
  icon: string;
  iconColor: string;
  quantityLabel?: string;
  showAvailable?: boolean;
};

const {
  title,
  items,
  icon,
  iconColor,
  quantityLabel = "计划",
  showAvailable = true,
} = defineProps<UcMaterialCostListProps>();
const missingKinds = computed<number>(() => items.filter((item) => (item.missing ?? 0) > 0).length);
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
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
  color: var(--box-text-1);
  gap: 8px;
}

.ucmcl-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  color: var(--common-text-sub);
  gap: 8px;

  h3 {
    margin: 0;
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 16px;
    font-weight: normal;
    line-height: 22px;
  }

  > span {
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    line-height: 16px;
  }
}

.ucmcl-list {
  display: grid;
  width: 100%;
  min-width: 0;
  gap: 8px;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
}

.ucmcl-row {
  display: flex;
  min-width: 0;
  min-height: 44px;
  box-sizing: border-box;
  align-items: center;
  padding: 2px 8px 2px 2px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--common-shadow-t-1);
  gap: 8px;

  &.missing {
    border-color: var(--tgc-od-red);
    box-shadow: inset 3px 0 var(--tgc-od-red);
  }
}

.ucmcl-info {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}

.ucmcl-name-row,
.ucmcl-stats {
  display: flex;
  min-width: 0;
  align-items: baseline;
  gap: 8px;
}

.ucmcl-name-row {
  justify-content: space-between;

  strong {
    overflow: hidden;
    color: var(--box-text-4);
    font-family: var(--font-title);
    font-size: 13px;
    font-weight: normal;
    line-height: 16px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.ucmcl-role {
  flex-shrink: 0;
  color: var(--common-text-sub);
  font-size: 10px;
  line-height: 14px;
}

.ucmcl-stats {
  flex-wrap: wrap;
  color: var(--common-text-sub);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  line-height: 14px;
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
</style>
