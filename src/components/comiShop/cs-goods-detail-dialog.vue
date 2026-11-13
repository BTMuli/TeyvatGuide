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
        :disabled="props.exchanging"
        aria-label="接收道具的角色"
        :items="props.roleOptions"
        class="cs-role-select"
        density="compact"
        hide-details
        item-title="label"
        item-value="key"
        placeholder="选择角色"
        variant="outlined"
      >
        <template #selection="{ item }">
          <span class="cs-role-selection">
            <span class="cs-role-selection-name">{{ item.nickname }}</span>
            <span class="cs-role-selection-subtitle">{{ item.subtitle }}</span>
          </span>
        </template>
        <template #item="{ props: itemProps, item }">
          <v-list-item v-bind="itemProps" :subtitle="item.subtitle" :title="item.nickname" />
        </template>
      </v-select>
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
      <template v-if="props.goods">
        <div class="cs-detail-summary">
          <img
            :class="{ 'is-sold-out': goodsStatus === 'sold-out' }"
            :src="props.goods.icon"
            alt=""
            class="cs-detail-cover"
            loading="lazy"
            referrerpolicy="no-referrer"
          />
          <div class="cs-detail-info">
            <h3>{{ props.goods.goods_name }}</h3>
            <div class="cs-price-row">
              <CsGoodsPrice :price="props.goods.price" suffix=" / 件" />
              <span v-if="showStock" :title="stockText" class="cs-stock">
                <v-icon aria-hidden="true" size="16">mdi-package-variant-closed</v-icon>
                <span class="cs-sr-only">当前库存</span>
                {{ stockCountText }}
              </span>
            </div>
            <div class="cs-detail-meta">
              <span class="cs-detail-state">{{ statusText }}</span>
              <span v-if="limitBadge" :title="limitText" class="cs-detail-limit">
                剩余限兑 {{ limitBadge }}
              </span>
              <CsGoodsBatch class="cs-detail-batch" :goods="props.goods" />
            </div>
          </div>
        </div>

        <section
          v-if="props.goods.goods_detail"
          aria-label="商品详细说明"
          class="cs-detail-description"
          v-html="props.goods.goods_detail"
        />

        <p v-if="props.rolesError" class="cs-status is-warning" role="alert">
          <v-icon aria-hidden="true" class="cs-status-icon" size="18">mdi-alert-outline</v-icon>
          <span>{{ props.rolesError }}</span>
        </p>
        <p v-if="props.goods.type === 1" class="cs-status is-info">
          <v-icon aria-hidden="true" class="cs-status-icon" size="18"
            >mdi-information-outline</v-icon
          >
          <span>实物商品请前往官方商店填写收货地址。</span>
        </p>
      </template>
    </div>
    <template #footer>
      <div class="cs-footer-actions">
        <v-btn
          v-if="props.needsVerification || props.exchangeUncertain || props.goods?.type === 1"
          variant="tonal"
          @click="emit('official')"
        >
          前往官方商店
        </v-btn>
        <v-btn :disabled="props.exchanging" variant="text" @click="open = false">关闭</v-btn>
        <v-btn
          v-if="props.goods && props.goods.type !== 1"
          :disabled="!props.canExchange"
          :loading="props.exchanging"
          class="cs-primary-action"
          color="var(--tgc-yellow-3)"
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
import CsGoodsBatch from "@comp/comiShop/cs-goods-batch.vue";
import CsGoodsPrice from "@comp/comiShop/cs-goods-price.vue";
import { getShopGoodsStatus } from "@utils/community/shop.js";
import {
  getShopLimitBadge,
  getShopLimitText,
  getShopStatusText,
  getShopStockText,
} from "@utils/community/shopDisplay.js";
import fmtUtil from "@utils/display/fmtUtil.js";
import { computed, useId } from "vue";

/**
 * 商品详情浮层参数。
 * @since Beta v0.13.1
 */
type CsGoodsDetailDialogProps = {
  /** 当前商品详情 */
  goods?: TGApp.BBS.Shop.Goods;
  /** 可选游戏角色 */
  roleOptions: Array<TGApp.BBS.Shop.RoleOption>;
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

const goodsStatus = computed<TGApp.BBS.Shop.GoodsStatus | undefined>(() =>
  props.goods ? getShopGoodsStatus(props.goods) : undefined,
);
const statusText = computed<string>(() => (props.goods ? getShopStatusText(props.goods) : ""));
const limitBadge = computed<string>(() => (props.goods ? getShopLimitBadge(props.goods) : ""));
const limitText = computed<string>(() => (props.goods ? getShopLimitText(props.goods) : ""));
const stockText = computed<string>(() => (props.goods ? getShopStockText(props.goods) : ""));
const stockCountText = computed<string>(() => {
  const goods = props.goods;
  if (!goods) return "";
  return goods.unlimit ? "∞" : fmtUtil.num(Math.max(0, goods.total));
});
const showRoleSelect = computed<boolean>(
  () => !!props.goods && props.goods.type !== 1 && props.goods.game !== "bbs",
);
const showStock = computed<boolean>(() => !!props.goods && goodsStatus.value !== "upcoming");
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

.cs-detail-description {
  display: flex;
  width: 100%;
  box-sizing: border-box;
  flex-direction: column;
  padding: 12px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-3);
  color: var(--app-page-content);
  font-size: 14px;
  gap: 12px;
  line-height: 22px;
  overflow-wrap: anywhere;

  :deep(img),
  :deep(video),
  :deep(table) {
    max-width: 100%;
    height: auto;
  }

  :deep(p) {
    margin: 0;
  }
}

.cs-status {
  display: flex;
  align-items: flex-start;
  padding: 8px 12px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  margin: 0;
  background: var(--box-bg-2);
  color: var(--box-text-2);
  font-size: 13px;
  gap: 8px;
  line-height: 20px;
  overflow-wrap: anywhere;

  &.is-error {
    color: var(--tgc-od-red);
  }

  &.is-warning {
    color: var(--tgc-od-orange);
  }
}

.cs-status-icon {
  flex-shrink: 0;
}

.cs-status > span {
  min-width: 0;
  flex: 1;
}

.cs-footer-actions {
  display: flex;
  width: 100%;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.cs-detail-summary {
  display: grid;
  align-items: start;
  gap: 16px;
  grid-template-columns: 112px minmax(0, 1fr);
}

.cs-detail-cover {
  width: 112px;
  height: 112px;
  border-radius: 8px;
  object-fit: contain;

  &.is-sold-out {
    filter: grayscale(1);
    opacity: 0.72;
  }
}

.cs-detail-info {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 8px;

  h3 {
    margin: 0;
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

.cs-detail-meta {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  font-size: 12px;
  gap: 8px 12px;
  line-height: 20px;
}

.cs-detail-state {
  color: var(--common-text-title);
  font-weight: 600;
}

.cs-detail-limit {
  color: var(--app-page-content);
}

.cs-detail-batch {
  flex: 1 1 auto;
  justify-content: flex-end;
}

.cs-stock {
  display: inline-flex;
  align-items: center;
  color: var(--app-page-content);
  font-size: 13px;
  gap: 4px;
  line-height: 20px;
}

.cs-role-select {
  width: clamp(132px, 38vw, 320px);
  max-width: calc(100vw - 132px);

  :deep(.v-field) {
    background: var(--box-bg-1);
  }

  :deep(.v-field__input) {
    flex-wrap: wrap;
    align-items: flex-start;
  }

  :deep(.v-select__selection) {
    display: flex;
    overflow: visible;
    min-width: 0;
    max-width: 100%;
  }

  :deep(.v-list-item-title),
  :deep(.v-list-item-subtitle) {
    overflow: visible;
    overflow-wrap: anywhere;
    white-space: normal;
  }
}

.cs-role-selection {
  display: flex;
  min-width: 0;
  max-width: 100%;
  flex-direction: column;
  gap: 2px;
}

.cs-role-selection-name {
  min-width: 0;
  color: var(--app-page-content);
  font-size: 14px;
  line-height: 20px;
  overflow-wrap: anywhere;
}

.cs-role-selection-subtitle {
  min-width: 0;
  color: var(--app-page-content);
  font-size: 12px;
  line-height: 16px;
  opacity: 0.7;
  overflow-wrap: anywhere;
}

.cs-primary-action {
  color: var(--tgc-dark-2);

  &:disabled {
    background: var(--box-bg-3);
    color: var(--box-text-2);
  }
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
    width: min(38vw, calc(100vw - 160px));
    max-width: calc(100vw - 160px);
  }

  .cs-detail-cover {
    justify-self: center;
  }
}
</style>
