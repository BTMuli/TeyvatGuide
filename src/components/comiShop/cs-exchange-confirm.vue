<!-- 商品兑换确认浮层 -->
<template>
  <TopOverlay
    v-model="open"
    :closeDisabled="props.exchanging"
    :showShare="false"
    :titleId="titleId"
    blurVal="10px"
    closeAriaLabel="关闭兑换确认"
    panelWidth="480px"
  >
    <template #header>
      <h2 :id="titleId" class="cs-confirm-title">确认兑换</h2>
    </template>
    <div v-if="props.goods" class="cs-confirm">
      <div class="cs-confirm-product">
        <img :src="props.goods.icon" alt="" class="cs-confirm-cover" referrerpolicy="no-referrer" />
        <div class="cs-confirm-product-info">
          <h3 class="cs-confirm-product-title">{{ props.goods.goods_name }}</h3>
          <span class="cs-confirm-quantity">数量：1 件</span>
        </div>
      </div>
      <div class="cs-confirm-summary">
        <div class="cs-confirm-row">
          <span class="cs-confirm-label">
            <v-icon aria-hidden="true" size="18">mdi-wallet-outline</v-icon>
            <span>当前余额</span>
          </span>
          <CsGoodsPrice v-if="props.balance !== undefined" :price="props.balance" />
          <span v-else class="cs-confirm-recipient">未获取</span>
        </div>
        <div class="cs-confirm-row cs-confirm-price">
          <span class="cs-confirm-label">
            <v-icon aria-hidden="true" size="18">mdi-wallet-outline</v-icon>
            <span>花费</span>
          </span>
          <CsGoodsPrice :price="props.goods.price" />
        </div>
        <div class="cs-confirm-row">
          <span class="cs-confirm-label">
            <v-icon aria-hidden="true" size="18">mdi-account-outline</v-icon>
            <span>接收角色/账号</span>
          </span>
          <span class="cs-confirm-recipient">{{ props.recipient }}</span>
        </div>
      </div>
      <p class="cs-confirm-note">
        <v-icon aria-hidden="true" size="18">mdi-information-outline</v-icon>
        <span>请确认商品和接收角色/账号后兑换。</span>
      </p>
    </div>
    <template #footer>
      <div class="cs-confirm-actions">
        <v-btn :disabled="props.exchanging" variant="text" @click="open = false">取消</v-btn>
        <v-btn
          :loading="props.exchanging"
          class="cs-primary-action"
          color="var(--tgc-yellow-3)"
          variant="flat"
          @click="emits('confirm')"
        >
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
  /** 当前米游币余额；获取失败时不传 */
  balance?: number;
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
  gap: 16px;
}

.cs-confirm-product {
  display: flex;
  align-items: center;
  gap: 12px;
}

.cs-confirm-cover {
  width: 64px;
  height: 64px;
  flex: none;
  border-radius: 8px;
  background: var(--box-bg-1);
  object-fit: contain;
}

.cs-confirm-product-info {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.cs-confirm-product-title {
  margin: 0;
  color: var(--common-text-title);
  font-size: 16px;
  line-height: 22px;
  overflow-wrap: anywhere;
}

.cs-confirm-quantity {
  color: var(--box-text-2);
  font-size: 13px;
  line-height: 20px;
}

.cs-confirm-summary {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cs-confirm-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.cs-confirm-label {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  color: var(--box-text-2);
  font-size: 13px;
  gap: 6px;
  line-height: 20px;
}

.cs-confirm-recipient {
  min-width: 0;
  flex: 1;
  line-height: 20px;
  overflow-wrap: anywhere;
}

.cs-confirm-note {
  display: flex;
  align-items: flex-start;
  padding: 0;
  margin: 0;
  color: var(--box-text-2);
  font-size: 13px;
  gap: 8px;
  line-height: 20px;

  > .v-icon {
    flex-shrink: 0;
  }

  > span {
    min-width: 0;
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

.cs-primary-action {
  color: var(--tgc-dark-2);

  &:disabled {
    background: var(--box-bg-3);
    color: var(--box-text-2);
  }
}
</style>
