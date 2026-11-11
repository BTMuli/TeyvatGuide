<template>
  <button class="shop-good" type="button" :disabled @click="handleOpen">
    <ShopGoodsCover :goods />
    <div class="shop-good-body" :class="{ 'is-sold-out': soldOut }">
      <h2 class="shop-good-title">{{ goods.goods_name }}</h2>
      <div class="shop-price-row">
        <span class="shop-good-price">
          <img src="/UI/app/miyou-coin.webp" alt="米游币" />
          {{ fmtUtil.num(goods.price) }}
        </span>
        <span class="shop-stock" :title="stockText">
          <v-icon aria-hidden="true" size="16">mdi-package-variant-closed</v-icon>
          <span class="shop-sr-only">当前库存</span>
          {{ goods.unlimit ? "∞" : fmtUtil.num(Math.max(0, goods.total)) }}
        </span>
      </div>
      <div v-if="goods.next_num > 0 || nextTimeText" class="shop-batch">
        <span v-if="goods.next_num > 0" :title="`下批放量 ${fmtUtil.num(goods.next_num)} 件`">
          <v-icon aria-hidden="true" size="16">mdi-package-variant-closed</v-icon>
          <span class="shop-sr-only">下批放量</span>
          {{ fmtUtil.num(goods.next_num) }}
        </span>
        <span v-if="nextTimeText" :title="`下批开售 ${nextTimeText}`">
          <v-icon aria-hidden="true" size="16">mdi-clock-outline</v-icon>
          <span class="shop-sr-only">下批开售</span>
          {{ nextTimeText }}
        </span>
      </div>
    </div>
  </button>
</template>

<script lang="ts" setup>
import ShopGoodsCover from "@comp/communityShop/shop-goods-cover.vue";
import {
  getShopNextTimeText,
  getShopStockText,
  isShopBatchSoldOut,
} from "@utils/community/shopDisplay.js";
import fmtUtil from "@utils/display/fmtUtil.js";
import { computed } from "vue";

type ShopGoodsItemProps = {
  goods: TGApp.BBS.Shop.Goods;
  disabled?: boolean;
};

const { goods, disabled = false } = defineProps<ShopGoodsItemProps>();
const emit = defineEmits<{ open: [goods: TGApp.BBS.Shop.Goods] }>();
const soldOut = computed<boolean>(() => isShopBatchSoldOut(goods));
const nextTimeText = computed<string>(() => getShopNextTimeText(goods));
const stockText = computed<string>(() => getShopStockText(goods));

function handleOpen(): void {
  emit("open", goods);
}
</script>

<style lang="scss" scoped>
.shop-good {
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

  &:disabled {
    cursor: default;
    opacity: 0.6;
  }
}

.shop-good-body {
  display: flex;
  min-width: 0;
  flex-direction: column;
  padding: 16px;
  gap: 8px;

  &.is-sold-out {
    color: var(--box-text-2);
    filter: grayscale(1);
  }
}

.shop-good-title {
  min-height: 44px;
  margin: 0;
  color: inherit;
  font-size: 16px;
  font-weight: 600;
  line-height: 22px;
  overflow-wrap: anywhere;
}

.shop-price-row {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.shop-good-price {
  display: inline-flex;
  align-items: center;
  color: var(--common-text-title);
  font-size: 18px;
  font-weight: 600;
  gap: 6px;
  line-height: 24px;
  white-space: nowrap;

  img {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }
}

.shop-stock {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  color: inherit;
  font-size: 12px;
  gap: 4px;
  line-height: 20px;
  white-space: nowrap;
}

.shop-batch {
  display: flex;
  overflow: hidden;
  min-width: 0;
  align-items: center;
  color: inherit;
  font-size: 12px;
  gap: 12px;
  line-height: 20px;
  white-space: nowrap;

  > span {
    display: inline-flex;
    min-width: 0;
    align-items: center;
    gap: 4px;
  }

  > span:last-child {
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.shop-sr-only {
  position: absolute;
  overflow: hidden;
  width: 1px;
  height: 1px;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
