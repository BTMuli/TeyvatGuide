<!-- 商店下一批放量与开售时间 -->
<template>
  <span v-if="hasBatch" class="cs-gb-batch">
    <v-icon aria-hidden="true" class="cs-gb-icon" size="16" title="下一批"
      >mdi-tray-arrow-down</v-icon
    >
    <span class="cs-gb-sr-only">下一批</span>
    <span class="cs-gb-details">
      <span
        v-if="props.goods.next_num > 0"
        class="cs-gb-quantity"
        :title="'下批放量 ' + fmtUtil.num(props.goods.next_num) + ' 件'"
      >
        <v-icon aria-hidden="true" size="16">mdi-package-variant-closed</v-icon>
        <span class="cs-gb-sr-only">下批放量</span>
        {{ fmtUtil.num(props.goods.next_num) }}
      </span>
      <span v-if="nextTimeText" class="cs-gb-time" :title="'下批开售 ' + nextTimeText">
        <v-icon aria-hidden="true" size="16">mdi-clock-outline</v-icon>
        <span class="cs-gb-sr-only">下批开售</span>
        <span>{{ nextTimeText }}</span>
      </span>
    </span>
  </span>
</template>

<script lang="ts" setup>
import { getShopNextTimeText } from "@utils/community/shopDisplay.js";
import fmtUtil from "@utils/display/fmtUtil.js";
import { computed } from "vue";

const props = defineProps<{ goods: TGApp.BBS.Shop.Goods }>();
const nextTimeText = computed<string>(() => getShopNextTimeText(props.goods));
const hasBatch = computed<boolean>(() => props.goods.next_num > 0 || nextTimeText.value !== "");
</script>

<style lang="scss" scoped>
.cs-gb-batch {
  display: flex;
  min-width: 0;
  max-width: 100%;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  color: inherit;
  font-size: 12px;
  gap: 4px;
  line-height: 20px;
}

.cs-gb-icon {
  flex-shrink: 0;
}

.cs-gb-details {
  display: flex;
  min-width: 0;
  max-width: 100%;
  flex-wrap: wrap;
  align-items: center;
  padding: 2px 4px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--box-bg-2) 40%, transparent);
  color: var(--box-text-2);
  gap: 4px 8px;

  > span {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: 4px;
    white-space: nowrap;

    > .v-icon {
      flex-shrink: 0;
    }
  }
}

.cs-gb-quantity {
  flex-shrink: 0;
}

.cs-gb-sr-only {
  position: absolute;
  overflow: hidden;
  width: 1px;
  height: 1px;
  padding: 0;
  border: 0;
  margin: -1px;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
