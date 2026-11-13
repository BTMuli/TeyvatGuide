<template>
  <div
    :aria-disabled="disabled || undefined"
    :tabindex="disabled ? -1 : 0"
    class="cs-good"
    role="button"
    @click="handleOpen"
    @keydown.enter.prevent="handleOpen"
    @keydown.space.prevent="handleOpen"
  >
    <CsGoodsCover :goods />
    <div class="cs-good-body" :class="{ 'is-sold-out': soldOut }">
      <h2 class="cs-good-title">{{ goods.goods_name }}</h2>
      <div class="cs-price-row">
        <CsGoodsPrice :price="goods.price" />
        <span v-if="status !== 'upcoming'" class="cs-stock" :title="stockText">
          <v-icon aria-hidden="true" size="16">mdi-package-variant-closed</v-icon>
          <span class="cs-sr-only">当前库存</span>
          {{ goods.unlimit ? "∞" : fmtUtil.num(Math.max(0, goods.total)) }}
        </span>
      </div>
      <CsGoodsBatch :goods class="cs-good-batch" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import CsGoodsBatch from "@comp/comiShop/cs-goods-batch.vue";
import CsGoodsCover from "@comp/comiShop/cs-goods-cover.vue";
import CsGoodsPrice from "@comp/comiShop/cs-goods-price.vue";
import { getShopGoodsStatus } from "@utils/community/shop.js";
import { getShopStockText, isShopBatchSoldOut } from "@utils/community/shopDisplay.js";
import fmtUtil from "@utils/display/fmtUtil.js";
import { computed } from "vue";

/**
 * 商品卡片参数。
 * @since Beta v0.13.1
 */
type CsGoodsItemProps = {
  goods: TGApp.BBS.Shop.Goods;
  disabled?: boolean;
};

const { goods, disabled = false } = defineProps<CsGoodsItemProps>();
const emit = defineEmits<{ open: [goods: TGApp.BBS.Shop.Goods] }>();
const status = computed<TGApp.BBS.Shop.GoodsStatus>(() => getShopGoodsStatus(goods));
const soldOut = computed<boolean>(() => isShopBatchSoldOut(goods));
const stockText = computed<string>(() => getShopStockText(goods));

function handleOpen(): void {
  if (disabled) return;
  emit("open", goods);
}
</script>

<style lang="scss" scoped>
.cs-good {
  display: flex;
  overflow: hidden;
  width: 100%;
  flex-direction: column;
  padding: 0;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
  color: var(--app-page-content);
  cursor: pointer;
  text-align: left;

  &:hover {
    background: var(--box-bg-4);
  }

  &:focus-visible {
    outline: 2px solid var(--common-text-title);
    outline-offset: 2px;
  }

  &[aria-disabled="true"] {
    cursor: default;
    opacity: 0.6;
  }
}

.cs-good-body {
  display: flex;
  min-width: 0;
  flex: 1 1 auto;
  flex-direction: column;
  padding: 16px;
  gap: 8px;

  &.is-sold-out {
    color: var(--box-text-2);
    filter: grayscale(1);
  }
}

.cs-good-title {
  min-height: 44px;
  flex: 1 1 auto;
  margin: 0;
  color: inherit;
  font-size: 16px;
  font-weight: 600;
  line-height: 22px;
  overflow-wrap: anywhere;
}

.cs-price-row {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.cs-good-batch {
  max-width: 100%;
  align-self: flex-end;
  justify-content: flex-end;
}

.cs-stock {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  color: inherit;
  font-size: 12px;
  gap: 4px;
  line-height: 20px;
  white-space: nowrap;
}

.cs-sr-only {
  position: absolute;
  overflow: hidden;
  width: 1px;
  height: 1px;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
