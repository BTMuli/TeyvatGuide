<!-- 商店下一批放量与开售时间 -->
<template>
  <span v-if="hasBatch" :class="{ 'is-nowrap': props.nowrap }" class="cs-gb-batch">
    <span
      v-if="props.goods.next_num > 0"
      :title="'下批放量 ' + fmtUtil.num(props.goods.next_num) + ' 件'"
    >
      <v-icon aria-hidden="true" size="16">mdi-package-variant-closed</v-icon>
      <span class="cs-gb-sr-only">下批放量</span>
      {{ fmtUtil.num(props.goods.next_num) }}
    </span>
    <span v-if="nextTimeText" :title="'下批开售 ' + nextTimeText">
      <v-icon aria-hidden="true" size="16">mdi-clock-outline</v-icon>
      <span class="cs-gb-sr-only">下批开售</span>
      {{ nextTimeText }}
    </span>
  </span>
</template>

<script lang="ts" setup>
import { getShopNextTimeText } from "@utils/community/shopDisplay.js";
import fmtUtil from "@utils/display/fmtUtil.js";
import { computed } from "vue";

/**
 * 商品批次信息参数。
 * @since Beta v0.13.1
 */
type CsGoodsBatchProps = {
  /** 商品信息 */
  goods: TGApp.BBS.Shop.Goods;
  /** 是否保持单行并省略开售时间 */
  nowrap?: boolean;
};

const props = withDefaults(defineProps<CsGoodsBatchProps>(), {
  nowrap: false,
});
const nextTimeText = computed<string>(() => getShopNextTimeText(props.goods));
const hasBatch = computed<boolean>(() => props.goods.next_num > 0 || nextTimeText.value !== "");
</script>

<style lang="scss" scoped>
.cs-gb-batch {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  color: inherit;
  font-size: 12px;
  gap: 12px;
  line-height: 20px;

  > span {
    display: inline-flex;
    min-width: 0;
    align-items: center;
    gap: 4px;
  }

  &.is-nowrap {
    overflow: hidden;
    flex-wrap: nowrap;
    white-space: nowrap;

    > span:last-child {
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
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
