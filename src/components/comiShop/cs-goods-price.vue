<!-- 商店米游币价格 -->
<template>
  <span class="cs-gp-price">
    <img alt="米游币" src="/UI/app/miyou-coin.webp" />
    <span class="cs-gp-value">{{ fmtUtil.num(props.price) }}{{ props.suffix ?? "" }}</span>
  </span>
</template>

<script lang="ts" setup>
import fmtUtil from "@utils/display/fmtUtil.js";

/**
 * 商店价格参数。
 * @since Beta v0.13.1
 */
type CsGoodsPriceProps = {
  /** 价格，单位米游币 */
  price: number;
  /** 价格后缀，如「 / 件」 */
  suffix?: string;
};

const props = defineProps<CsGoodsPriceProps>();
</script>

<style lang="scss" scoped>
.cs-gp-price {
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
</style>
