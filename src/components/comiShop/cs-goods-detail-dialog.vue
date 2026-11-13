<template>
  <TopOverlay
    v-model="open"
    :closeDisabled="props.exchanging"
    :showShare="false"
    :titleId="titleId"
    blurVal="10px"
    closeAriaLabel="关闭商品详情"
    contentMaxHeight="none"
    panelMaxHeight="calc(100dvh - 48px)"
    panelWidth="760px"
  >
    <template #header>
      <h2 :id="titleId" class="cs-detail-title">商品详情</h2>
    </template>
    <template #actions>
      <v-select
        v-if="showRoleSelect"
        v-model="roleKey"
        :disabled="props.rolesLoading || props.exchanging"
        aria-label="接收道具的角色"
        :items="props.roleOptions"
        :loading="props.rolesLoading"
        class="cs-role-select"
        density="compact"
        hide-details
        item-title="label"
        item-value="key"
        placeholder="选择角色"
        variant="outlined"
      />
      <v-btn
        :disabled="props.exchanging"
        aria-label="关闭商品详情"
        density="comfortable"
        icon="mdi-close"
        title="关闭商品详情"
        variant="text"
        @click="open = false"
      />
    </template>
    <div class="cs-detail-content">
      <v-progress-linear v-if="props.loading" aria-label="正在加载商品详情" indeterminate />
      <p v-if="props.error" class="cs-status is-error" role="alert">{{ props.error }}</p>
      <template v-if="props.goods">
        <div class="cs-detail-summary">
          <CsGoodsCover :goods="props.goods" class="cs-detail-cover" />
          <div class="cs-detail-info">
            <h3>{{ props.goods.goods_name }}</h3>
            <div class="cs-price-row">
              <CsGoodsPrice :price="props.goods.price" suffix=" / 件" />
              <span :title="stockText" class="cs-stock">
                <v-icon aria-hidden="true" size="16">mdi-package-variant-closed</v-icon>
                <span class="cs-sr-only">当前库存</span>
                {{ stockCountText }}
              </span>
            </div>
            <CsGoodsBatch class="cs-detail-batch" :goods="props.goods" />
          </div>
        </div>

        <CsDescription v-if="props.goods.goods_detail" :content="props.goods.goods_detail" />

        <p v-if="props.rolesError" class="cs-status is-warning" role="alert">
          {{ props.rolesError }}
        </p>
        <p v-if="props.goods.type === 1" class="cs-status is-info">
          实物商品请前往官方商店填写收货地址。
        </p>
      </template>
    </div>
    <template #footer>
      <div class="cs-footer-start">
        <v-btn
          v-if="props.needsVerification || props.exchangeUncertain || props.goods?.type === 1"
          variant="tonal"
          @click="emit('official')"
        >
          前往官方商店
        </v-btn>
      </div>
      <div class="cs-footer-actions">
        <v-btn :disabled="props.exchanging" variant="text" @click="open = false">关闭</v-btn>
        <v-btn
          v-if="props.goods && props.goods.type !== 1"
          :disabled="!props.canExchange"
          :loading="props.exchanging"
          color="primary"
          variant="flat"
          @click="emit('exchange')"
        >
          {{ props.exchangeButtonText }}
        </v-btn>
      </div>
    </template>
  </TopOverlay>
</template>

<script lang="ts" setup>
import TopOverlay from "@comp/app/top-overlay.vue";
import CsDescription from "@comp/comiShop/cs-description.vue";
import CsGoodsBatch from "@comp/comiShop/cs-goods-batch.vue";
import CsGoodsCover from "@comp/comiShop/cs-goods-cover.vue";
import CsGoodsPrice from "@comp/comiShop/cs-goods-price.vue";
import { getShopStockText } from "@utils/community/shopDisplay.js";
import fmtUtil from "@utils/display/fmtUtil.js";
import { computed, useId } from "vue";

/**
 * 商品详情浮层参数。
 * @since Beta v0.13.1
 */
type CsGoodsDetailDialogProps = {
  /** 当前商品详情 */
  goods?: TGApp.BBS.Shop.Goods;
  /** 是否正在加载商品详情 */
  loading: boolean;
  /** 商品详情加载错误 */
  error: string;
  /** 可选游戏角色 */
  roleOptions: Array<TGApp.BBS.Shop.RoleOption>;
  /** 是否正在加载游戏角色 */
  rolesLoading: boolean;
  /** 游戏角色加载错误 */
  rolesError: string;
  /** 兑换结果是否未确认 */
  exchangeUncertain: boolean;
  /** 是否需要先完成人机验证 */
  needsVerification: boolean;
  /** 是否正在兑换 */
  exchanging: boolean;
  /** 是否允许兑换 */
  canExchange: boolean;
  /** 兑换按钮文案 */
  exchangeButtonText: string;
};

/**
 * 商品详情浮层事件。
 * @since Beta v0.13.1
 */
type CsGoodsDetailDialogEmits = {
  /** 请求兑换当前商品 */
  exchange: [];
  /** 请求打开官方商店 */
  official: [];
};

const props = defineProps<CsGoodsDetailDialogProps>();
const open = defineModel<boolean>({ required: true });
const roleKey = defineModel<string | undefined>("roleKey", { required: true });
const emit = defineEmits<CsGoodsDetailDialogEmits>();
const titleId = useId();

const stockText = computed<string>(() => (props.goods ? getShopStockText(props.goods) : ""));
const stockCountText = computed<string>(() => {
  const goods = props.goods;
  if (!goods) return "";
  return goods.unlimit ? "∞" : fmtUtil.num(Math.max(0, goods.total));
});
const showRoleSelect = computed<boolean>(
  () => !!props.goods && props.goods.type !== 1 && props.goods.game !== "bbs",
);
</script>

<style lang="scss" scoped>
.cs-detail-content {
  display: flex;
  flex-direction: column;
  padding: 16px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
  gap: 16px;
}

.cs-detail-title {
  margin: 0;
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 20px;
  font-weight: normal;
  line-height: 28px;
}

.cs-status {
  padding: 8px 12px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  margin: 0;
  background: var(--box-bg-2);
  color: var(--box-text-2);
  font-size: 13px;
  line-height: 20px;
  overflow-wrap: anywhere;

  &.is-error {
    color: var(--tgc-od-red);
  }

  &.is-warning {
    color: var(--tgc-od-orange);
  }
}

.cs-footer-start,
.cs-footer-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cs-footer-actions {
  margin-left: auto;
}

.cs-detail-summary {
  display: grid;
  align-items: start;
  gap: 16px;
  grid-template-columns: 144px minmax(0, 1fr);
}

.cs-detail-cover {
  width: 144px;
  height: 144px;
  border-radius: 8px;
}

.cs-detail-info {
  min-width: 0;

  h3 {
    margin: 0 0 8px;
    color: var(--common-text-title);
    font-size: 18px;
    line-height: 24px;
    overflow-wrap: anywhere;
  }
}

.cs-price-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.cs-detail-batch {
  margin-top: 8px;
}

.cs-stock {
  display: inline-flex;
  align-items: center;
  margin-left: auto;
  color: var(--app-page-content);
  font-size: 13px;
  gap: 4px;
  line-height: 20px;
}

.cs-role-select {
  width: 220px;
  flex: none;
}

.cs-sr-only {
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

@media (width <= 640px) {
  .cs-detail-summary {
    grid-template-columns: 1fr;
  }

  .cs-role-select {
    width: 160px;
  }

  .cs-detail-cover {
    width: min(100%, 240px);
    max-width: 240px;
    height: auto;
    justify-self: center;
  }
}
</style>
