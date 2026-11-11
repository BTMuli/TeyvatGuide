<template>
  <v-dialog v-model="open" :persistent="props.exchanging" max-width="760" scrollable>
    <v-card class="shop-dialog" rounded="lg">
      <v-card-title class="shop-dialog-title">
        <h2>商品详情</h2>
        <v-btn
          :disabled="props.exchanging"
          aria-label="关闭商品详情"
          icon="mdi-close"
          size="small"
          variant="text"
          @click="open = false"
        />
      </v-card-title>
      <v-card-text>
        <v-progress-linear v-if="props.loading" aria-label="正在加载商品详情" indeterminate />
        <v-alert v-if="props.error" type="error" variant="tonal">{{ props.error }}</v-alert>
        <template v-if="props.goods">
          <div class="shop-detail-summary">
            <ShopGoodsCover :goods="props.goods" class="shop-detail-cover" />
            <div class="shop-detail-info">
              <h3>{{ props.goods.goods_name }}</h3>
              <div class="shop-price-row">
                <p class="shop-good-price">
                  <img alt="米游币" src="/UI/app/miyou-coin.webp" />
                  {{ fmtUtil.num(props.goods.price) }} / 件
                </p>
                <span :title="stockText" class="shop-stock">
                  <v-icon aria-hidden="true" size="16">mdi-package-variant-closed</v-icon>
                  <span class="shop-sr-only">当前库存</span>
                  {{ stockCountText }}
                </span>
              </div>
              <div v-if="props.goods.next_num > 0 || nextTimeText" class="shop-batch">
                <span
                  v-if="props.goods.next_num > 0"
                  :title="'下批放量 ' + fmtUtil.num(props.goods.next_num) + ' 件'"
                >
                  <v-icon aria-hidden="true" size="16">mdi-package-variant-closed</v-icon>
                  <span class="shop-sr-only">下批放量</span>
                  {{ fmtUtil.num(props.goods.next_num) }}
                </span>
                <span v-if="nextTimeText" :title="'下批开售 ' + nextTimeText">
                  <v-icon aria-hidden="true" size="16">mdi-clock-outline</v-icon>
                  <span class="shop-sr-only">下批开售</span>
                  {{ nextTimeText }}
                </span>
              </div>
            </div>
          </div>

          <ShopDescription v-if="props.goods.goods_detail" :content="props.goods.goods_detail" />

          <template v-if="props.goods.type !== 1">
            <p v-if="props.goods.game === 'bbs'" class="shop-recipient">
              发放至米游社账号：{{ props.accountName }}（{{ maskUidTail(props.accountUid) }}）
            </p>
            <v-select
              v-else
              v-model="roleKey"
              :disabled="props.rolesLoading || props.exchanging"
              :items="props.roleOptions"
              :loading="props.rolesLoading"
              class="shop-role-select"
              hide-details
              item-title="label"
              item-value="key"
              label="接收道具的角色"
              placeholder="请选择角色"
              variant="outlined"
            />
            <v-alert v-if="props.rolesError" type="warning" variant="tonal">
              {{ props.rolesError }}
            </v-alert>
          </template>
          <v-alert v-else type="info" variant="tonal">
            实物商品请前往官方商店填写收货地址。
          </v-alert>

          <v-alert
            v-if="props.exchangeMessage"
            :type="props.exchangeSucceeded ? 'success' : 'warning'"
            variant="tonal"
          >
            {{ props.exchangeMessage }}
          </v-alert>
        </template>
      </v-card-text>
      <v-card-actions>
        <v-btn
          v-if="props.needsVerification || props.exchangeUncertain || props.goods?.type === 1"
          variant="tonal"
          @click="emit('official')"
        >
          前往官方商店
        </v-btn>
        <v-spacer />
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
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
import ShopDescription from "@comp/communityShop/shop-description.vue";
import ShopGoodsCover from "@comp/communityShop/shop-goods-cover.vue";
import { getShopNextTimeText, getShopStockText } from "@utils/community/shopDisplay.js";
import fmtUtil from "@utils/display/fmtUtil.js";
import { maskUidTail } from "@utils/display/TGUid.js";
import { computed } from "vue";

type ShopGoodsDetailDialogProps = {
  goods?: TGApp.BBS.Shop.Goods;
  loading: boolean;
  error: string;
  roleOptions: Array<TGApp.BBS.Shop.RoleOption>;
  rolesLoading: boolean;
  rolesError: string;
  accountName: string;
  accountUid?: string;
  exchangeMessage: string;
  exchangeSucceeded: boolean;
  exchangeUncertain: boolean;
  needsVerification: boolean;
  exchanging: boolean;
  canExchange: boolean;
  exchangeButtonText: string;
};

const props = defineProps<ShopGoodsDetailDialogProps>();
const open = defineModel<boolean>({ required: true });
const roleKey = defineModel<string | undefined>("roleKey", { required: true });
const emit = defineEmits<{ exchange: []; official: [] }>();

const nextTimeText = computed<string>(() => (props.goods ? getShopNextTimeText(props.goods) : ""));
const stockText = computed<string>(() => (props.goods ? getShopStockText(props.goods) : ""));
const stockCountText = computed<string>(() => {
  const goods = props.goods;
  if (!goods) return "";
  return goods.unlimit ? "∞" : fmtUtil.num(Math.max(0, goods.total));
});
</script>

<style lang="scss" scoped>
.shop-dialog {
  background: var(--app-page-bg);
  color: var(--app-page-content);

  :deep(.v-card-text) {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  p {
    margin: 0;
    overflow-wrap: anywhere;
  }
}

.shop-dialog-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;

  h2 {
    margin: 0;
    color: var(--common-text-title);
    font-size: 20px;
    font-weight: 600;
    line-height: 28px;
  }
}

.shop-detail-summary {
  display: grid;
  align-items: start;
  gap: 16px;
  grid-template-columns: 144px minmax(0, 1fr);
}

.shop-detail-cover {
  width: 144px;
  height: 144px;
  border-radius: 8px;
}

.shop-detail-info {
  min-width: 0;

  h3 {
    margin: 0 0 8px;
    color: var(--common-text-title);
    font-size: 18px;
    line-height: 24px;
    overflow-wrap: anywhere;
  }
}

.shop-price-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
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

  img {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }
}

.shop-stock {
  display: inline-flex;
  align-items: center;
  margin-left: auto;
  color: var(--app-page-content);
  font-size: 13px;
  gap: 4px;
  line-height: 20px;
}

.shop-batch {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  margin-top: 8px;
  font-size: 12px;
  gap: 12px;
  line-height: 20px;

  > span {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
}

.shop-recipient {
  color: var(--app-page-content);
}

.shop-role-select {
  flex: 0 0 auto;
}

.shop-sr-only {
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
  .shop-detail-summary {
    grid-template-columns: 1fr;
  }

  .shop-detail-cover {
    width: min(100%, 240px);
    max-width: 240px;
    height: auto;
    justify-self: center;
  }
}
</style>
