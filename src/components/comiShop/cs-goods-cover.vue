<template>
  <div :data-status="status" class="cs-goods-cover">
    <img
      :class="{ 'is-sold-out': soldOut }"
      :src="goods.icon"
      alt=""
      loading="lazy"
      referrerpolicy="no-referrer"
    />
    <span v-if="limitBadge" :title="getShopLimitText(goods)" class="cs-good-limit"
      >可兑换 {{ limitBadge }}</span
    >
    <span class="cs-good-status">{{ getShopStatusText(goods) }}</span>
    <span v-if="soldOut" class="cs-sold-out">售罄</span>
  </div>
</template>
<script lang="ts" setup>
import { getShopGoodsStatus } from "@utils/community/shop.js";
import {
  getShopLimitBadge,
  getShopLimitText,
  getShopStatusText,
  isShopBatchSoldOut,
} from "@utils/community/shopDisplay.js";
import { computed } from "vue";

const { goods } = defineProps<{ goods: TGApp.BBS.Shop.Goods }>();
const status = computed<TGApp.BBS.Shop.GoodsStatus>(() => getShopGoodsStatus(goods));
const limitBadge = computed<string>(() => getShopLimitBadge(goods));
const soldOut = computed<boolean>(() => isShopBatchSoldOut(goods));
</script>
<style lang="scss" scoped>
.cs-goods-cover {
  --cs-state-available: #0b4f31ff;
  --cs-state-upcoming: #644100ff;
  --cs-state-limited: #7a2634ff;
  --cs-state-muted: #39424eff;
  --cs-state-color: var(--cs-state-muted);

  position: relative;
  overflow: hidden;
  width: 100%;
  flex-shrink: 0;
  border-radius: 8px;
  aspect-ratio: 1;

  &[data-status="available"] {
    --cs-state-color: var(--cs-state-available);
  }

  &[data-status="upcoming"] {
    --cs-state-color: var(--cs-state-upcoming);
  }

  &[data-status="limit-reached"] {
    --cs-state-color: var(--cs-state-limited);
  }

  > img {
    display: block;
    width: 100%;
    height: 100%;
    border-radius: 8px;
    object-fit: cover;
  }

  > img.is-sold-out {
    border-radius: 8px;
    filter: grayscale(1);
    opacity: 0.72;
  }
}

.cs-good-limit,
.cs-good-status,
.cs-sold-out {
  position: absolute;
  padding: 4px 8px;
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  background: color-mix(in srgb, var(--cs-state-color) 76%, transparent);
  color: var(--tgc-white-1);
  font-size: 12px;
  font-weight: 600;
  line-height: 20px;
  white-space: nowrap;
}

.cs-good-limit {
  top: 0;
  right: 0;
  border-bottom-left-radius: 8px;
  border-top-right-radius: 8px;
}

.cs-good-status {
  bottom: 0;
  left: 0;
  border-bottom-left-radius: 8px;
  border-top-right-radius: 8px;
}

.cs-sold-out {
  right: 0;
  bottom: 0;
  background: color-mix(in srgb, var(--cs-state-muted) 76%, transparent);
  border-bottom-right-radius: 8px;
  border-top-left-radius: 8px;
}
</style>
