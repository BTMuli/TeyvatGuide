<!-- 商品兑换确认浮层 -->
<template>
  <TopOverlay
    v-model="open"
    :closeDisabled="props.exchanging"
    :showShare="false"
    :titleId="titleId"
    blurVal="10px"
    closeAriaLabel="关闭兑换确认"
    panelWidth="440px"
  >
    <template #header>
      <h2 :id="titleId" class="cs-confirm-title">确认兑换</h2>
    </template>
    <div v-if="props.goods" class="cs-confirm">
      <p>{{ props.goods.goods_name }} × 1</p>
      <p class="cs-confirm-price">
        花费
        <CsGoodsPrice :price="props.goods.price" />
      </p>
      <p>接收账号：{{ props.recipient }}</p>
      <p>请确认商品和接收账号后兑换。</p>
    </div>
    <template #footer>
      <div class="cs-confirm-actions">
        <v-btn :disabled="props.exchanging" variant="text" @click="open = false">取消</v-btn>
        <v-btn :loading="props.exchanging" color="primary" variant="flat" @click="emits('confirm')">
          确认兑换
        </v-btn>
      </div>
    </template>
  </TopOverlay>
</template>

<script lang="ts" setup>
import TopOverlay from "@comp/app/top-overlay.vue";
import CsGoodsPrice from "@comp/comiShop/cs-goods-price.vue";
import { useId } from "vue";

/**
 * 兑换确认浮层参数。
 * @since Beta v0.13.1
 */
type CsExchangeConfirmProps = {
  /** 待兑换商品 */
  goods?: TGApp.BBS.Shop.Goods;
  /** 接收账号描述 */
  recipient: string;
  /** 是否正在兑换 */
  exchanging: boolean;
};

/**
 * 兑换确认浮层事件。
 * @since Beta v0.13.1
 */
type CsExchangeConfirmEmits = {
  /** 确认兑换 */
  confirm: [];
};

const props = defineProps<CsExchangeConfirmProps>();
const open = defineModel<boolean>({ required: true });
const emits = defineEmits<CsExchangeConfirmEmits>();
const titleId = useId();
</script>

<style lang="scss" scoped>
.cs-confirm {
  display: flex;
  flex-direction: column;
  gap: 8px;

  p {
    margin: 0;
    overflow-wrap: anywhere;
  }
}

.cs-confirm-title {
  margin: 0;
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 20px;
  font-weight: normal;
  line-height: 28px;
}

.cs-confirm-actions {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.cs-confirm-price {
  display: inline-flex;
  align-items: center;
  color: var(--common-text-title);
  font-size: 18px;
  font-weight: 600;
  gap: 6px;
  line-height: 24px;
}
</style>
