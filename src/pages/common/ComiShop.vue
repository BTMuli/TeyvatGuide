<template>
  <main aria-label="米社商店" class="community-shop">
    <header class="shop-header">
      <div>
        <h1>兑换中心</h1>
      </div>
      <div aria-live="polite" class="shop-balance">
        <span>米游币余额</span>
        <strong>
          <img alt="" class="shop-balance-icon" src="/UI/app/miyou-coin.webp" />
          <span>{{ balanceText }}</span>
        </strong>
      </div>
      <div class="shop-actions">
        <v-btn
          :disabled="!canLoad || loading || exchanging"
          prepend-icon="mdi-refresh"
          variant="tonal"
          @click="refresh"
        >
          刷新
        </v-btn>
        <v-btn prepend-icon="mdi-open-in-new" variant="text" @click="openOfficial">
          官方商店
        </v-btn>
      </div>
    </header>

    <div class="shop-filters">
      <nav v-if="categories.length" aria-label="商品分区" class="shop-filter-group">
        <span class="shop-filter-label">商品分区</span>
        <v-btn-toggle
          :modelValue="selectedGame"
          :disabled="exchanging"
          aria-label="商品分区"
          class="shop-filter-toggle"
          color="var(--common-text-title)"
          density="compact"
          mandatory
          variant="text"
          @update:model-value="selectCategory"
        >
          <v-btn
            v-for="category in categoryOptions"
            :key="category.key"
            :aria-label="'商品分区：' + category.name"
            :title="category.name"
            :value="category.key"
            size="small"
          >
            <img v-if="category.icon" :src="category.icon" alt="" class="shop-category-icon" />
            <v-icon v-else aria-hidden="true" size="20">mdi-tag-outline</v-icon>
          </v-btn>
        </v-btn-toggle>
      </nav>
      <div class="shop-filter-group">
        <span class="shop-filter-label">商品品类</span>
        <v-btn-toggle
          :modelValue="selectedGoodsType"
          :disabled="exchanging"
          aria-label="商品品类"
          class="shop-filter-toggle"
          color="var(--common-text-title)"
          density="compact"
          mandatory
          variant="text"
          @update:model-value="selectGoodsType"
        >
          <v-btn
            v-for="option in goodsTypeOptions"
            :key="option.key"
            :aria-label="'商品品类：' + option.label"
            :title="'商品品类：' + option.label"
            :value="option.key"
            size="small"
          >
            <v-icon aria-hidden="true" size="20">{{ option.icon }}</v-icon>
          </v-btn>
        </v-btn-toggle>
      </div>
      <div class="shop-filter-group">
        <span class="shop-filter-label">库存情况</span>
        <v-btn-toggle
          :modelValue="selectedStock"
          :disabled="exchanging"
          aria-label="库存情况"
          class="shop-filter-toggle"
          color="var(--common-text-title)"
          density="compact"
          mandatory
          variant="text"
          @update:model-value="selectStock"
        >
          <v-btn
            v-for="option in stockOptions"
            :key="option.key"
            :aria-label="'库存情况：' + option.label"
            :title="'库存情况：' + option.label"
            :value="option.key"
            size="small"
          >
            <v-icon aria-hidden="true" size="20">{{ option.icon }}</v-icon>
          </v-btn>
        </v-btn-toggle>
      </div>
    </div>
    <section
      ref="shopCatalog"
      aria-label="商品列表"
      class="shop-catalog"
      tabindex="0"
      @scroll.passive="handleCatalogScroll"
    >
      <div v-if="listError" class="shop-state" role="alert">
        <p>{{ listError }}</p>
        <v-btn :disabled="loading" variant="tonal" @click="retryGoods">重试</v-btn>
        <v-btn v-if="needsVerification" variant="text" @click="openOfficial">
          前往官方商店验证
        </v-btn>
      </div>
      <div v-if="visibleGoods.length" :aria-busy="loading || detailLoading" class="shop-grid">
        <CsGoodsItem
          v-for="item in visibleGoods"
          :key="item.goods_id"
          :disabled="exchanging"
          :goods="item"
          @open="openDetail"
        />
      </div>
      <p v-else-if="!loading && !listError && !hasMore" class="shop-state">
        这个筛选条件暂时没有商品
      </p>
      <footer v-if="loading || hasMore" aria-live="polite" class="shop-pagination">
        <span>{{ loading ? "正在加载商品…" : "继续下滑加载更多" }}</span>
      </footer>
    </section>

    <CsGoodsDetailDialog
      v-model="detailOpen"
      v-model:roleKey="roleKey"
      :canExchange
      :exchangeButtonText
      :exchangeUncertain
      :exchanging
      :goods="detail"
      :needsVerification
      :roleOptions
      :rolesError
      @exchange="prepareExchange"
      @official="openOfficial"
    />

    <CsExchangeConfirm
      v-model="confirmOpen"
      :balance="point?.points"
      :exchanging
      :goods="pendingExchange?.goods"
      :recipient="pendingExchange?.recipient ?? ''"
      @confirm="exchange"
    />
  </main>
</template>

<script lang="ts" setup>
import CsExchangeConfirm from "@comp/comiShop/cs-exchange-confirm.vue";
import CsGoodsDetailDialog from "@comp/comiShop/cs-goods-detail-dialog.vue";
import CsGoodsItem from "@comp/comiShop/cs-goods-item.vue";
import showSnackbar from "@comp/func/snackbar.js";
import shopReq from "@req/shopReq.js";
import takumiReq from "@req/takumiReq.js";
import useAppStore from "@store/app.js";
import useBBSStore from "@store/bbs.js";
import useUserStore from "@store/user.js";
import TGClient from "@utils/app/TGClient.js";
import { matchesCurrentAccount } from "@utils/bbs/replyAccount.js";
import {
  buildShopExchangeParams,
  getShopGoodsStatus,
  getShopResponseError,
} from "@utils/community/shop.js";
import { getShopStatusText } from "@utils/community/shopDisplay.js";
import fmtUtil from "@utils/display/fmtUtil.js";
import { maskUidTail } from "@utils/display/TGUid.js";
import TGHttps from "@utils/network/TGHttps.js";
import { storeToRefs } from "pinia";
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  useTemplateRef,
  watch,
} from "vue";

type AccountSnapshot = {
  version: number;
  uid: string;
  cookie: TGApp.App.Account.Cookie;
};

type PendingExchange = {
  snapshot: AccountSnapshot;
  goods: TGApp.BBS.Shop.Goods;
  role?: TGApp.BBS.Game.Account;
  recipient: string;
};

type GoodsTypeFilter = "all" | "physical" | "virtual";

type StockFilter = "all" | "available" | "upcoming" | "sold-out";

/**
 * 图标筛选项。
 * @since Beta v0.13.1
 */
type FilterOption<T extends string> = {
  key: T;
  label: string;
  icon: string;
};

const { isLogin } = storeToRefs(useAppStore());
const bbsStore = useBBSStore();
const { gameList } = storeToRefs(bbsStore);
const { cookie, uid, briefInfo } = storeToRefs(useUserStore());
const canLoad = computed<boolean>(
  () =>
    !!(
      isLogin.value &&
      uid.value &&
      cookie.value?.ltoken.trim() &&
      cookie.value.ltuid === uid.value &&
      (!cookie.value.account_id || cookie.value.account_id === uid.value)
    ),
);
const point = shallowRef<TGApp.BBS.Shop.PointInfo>();
const pointError = ref<string>("");
const categories = shallowRef<Array<TGApp.BBS.Shop.Game>>([]);
const categoryOptions = computed<Array<TGApp.BBS.Shop.Game>>(() =>
  categories.value.map((category) => {
    const game = gameList.value.find(
      (item) => item.op_name === category.key || item.name === category.name,
    );
    const icon =
      category.key === "all"
        ? "/UI/nav/mybExchange.webp"
        : category.key === "bbs"
          ? "/platforms/mhy/mys.webp"
          : category.icon || game?.app_icon || game?.icon;
    return { ...category, icon };
  }),
);
const selectedGame = ref<string>("all");
const goodsTypeOptions: Array<FilterOption<GoodsTypeFilter>> = [
  { key: "all", label: "全部", icon: "mdi-view-grid-outline" },
  { key: "physical", label: "实物商品", icon: "mdi-package-variant-closed" },
  { key: "virtual", label: "虚拟道具", icon: "mdi-gamepad-variant-outline" },
];
const stockOptions: Array<FilterOption<StockFilter>> = [
  { key: "all", label: "全部", icon: "mdi-filter-variant" },
  { key: "available", label: "有库存", icon: "mdi-check-circle-outline" },
  { key: "upcoming", label: "待开售", icon: "mdi-clock-outline" },
  { key: "sold-out", label: "已售罄", icon: "mdi-close-circle-outline" },
];
const selectedGoodsType = ref<GoodsTypeFilter>("all");
const selectedStock = ref<StockFilter>("all");
const goods = shallowRef<Array<TGApp.BBS.Shop.Goods>>([]);
const page = ref<number>(0);
const pageSize = 20;
const loading = ref<boolean>(false);
const hasMore = ref<boolean>(false);
const listError = ref<string>("");
const appendError = ref<boolean>(false);
const needsVerification = ref<boolean>(false);
const detailOpen = ref<boolean>(false);
const detail = shallowRef<TGApp.BBS.Shop.Goods>();
const detailLoading = ref<boolean>(false);
const roles = shallowRef<Array<TGApp.BBS.Game.Account>>([]);
const roleKey = ref<string>();
const rolesError = ref<string>("");
const confirmOpen = ref<boolean>(false);
const pendingExchange = shallowRef<PendingExchange>();
const exchanging = ref<boolean>(false);
const uncertainGoods = ref<Array<string>>([]);
const exchangeUncertain = computed<boolean>(
  () => !!detail.value && uncertainGoods.value.includes(`${uid.value}:${detail.value.goods_id}`),
);
const exchangeSucceeded = ref<boolean>(false);
let sessionVersion = 0;
let listVersion = 0;
let detailVersion = 0;
const shopCatalog = useTemplateRef<HTMLElement>("shopCatalog");
const detailRequestGoodsId = ref<string>();

const balanceText = computed<string>(() => (point.value ? fmtUtil.num(point.value.points) : "—"));
const visibleGoods = computed<Array<TGApp.BBS.Shop.Goods>>(() =>
  goods.value.filter((item) => {
    const matchesType =
      selectedGoodsType.value === "all" ||
      (selectedGoodsType.value === "physical" && item.type === 1) ||
      (selectedGoodsType.value === "virtual" && item.type === 2);
    if (!matchesType) return false;
    const status = getShopGoodsStatus(item);
    return (
      selectedStock.value === "all" ||
      (selectedStock.value === "available" &&
        (status === "available" ||
          (status === "limit-reached" && (item.unlimit === true || item.total > 0)))) ||
      (selectedStock.value === "upcoming" && status === "upcoming") ||
      (selectedStock.value === "sold-out" && status === "sold-out")
    );
  }),
);
const roleOptions = computed<Array<TGApp.BBS.Shop.RoleOption>>(() =>
  roles.value.map((role) => ({
    key: getRoleKey(role),
    label: `${role.nickname} · ${role.region_name} · ${maskUidTail(role.game_uid)}`,
    nickname: role.nickname,
    subtitle: `${maskUidTail(role.game_uid)}(${role.region_name})`,
  })),
);
const selectedRole = computed<TGApp.BBS.Game.Account | undefined>(() =>
  roles.value.find((role) => getRoleKey(role) === roleKey.value),
);
const canExchange = computed<boolean>(
  () =>
    !!(
      detail.value &&
      !detailLoading.value &&
      !exchanging.value &&
      !needsVerification.value &&
      !exchangeUncertain.value &&
      !exchangeSucceeded.value &&
      point.value &&
      detail.value.type !== 1 &&
      getShopGoodsStatus(detail.value) === "available" &&
      point.value.points >= detail.value.price &&
      (detail.value.game === "bbs" || selectedRole.value)
    ),
);
const exchangeButtonText = computed<string>(() => {
  if (exchangeSucceeded.value) return "已兑换";
  if (exchangeUncertain.value) return "请先核对兑换记录";
  if (needsVerification.value) return "请先完成人机验证";
  if (detail.value && getShopGoodsStatus(detail.value) !== "available")
    return getShopStatusText(detail.value);
  if (!point.value) return "余额未获取";
  if (detail.value && point.value.points < detail.value.price) return "米游币不足";
  return "兑换 1 件";
});

function getRoleKey(role: TGApp.BBS.Game.Account): string {
  return `${role.game_biz}:${role.region}:${role.game_uid}`;
}

function getSnapshot(): AccountSnapshot | undefined {
  if (!canLoad.value || !cookie.value || !uid.value) return;
  return { version: sessionVersion, uid: uid.value, cookie: { ...cookie.value } };
}

function isCurrent(snapshot: AccountSnapshot): boolean {
  return snapshot.version === sessionVersion && snapshot.uid === uid.value;
}

function checkResponse(response: { retcode: number; message: string }): void {
  if (response.retcode === 1034 || response.retcode === 1028) needsVerification.value = true;
  const error = getShopResponseError(response);
  if (error) throw new Error(error);
}

async function loadPoint(): Promise<void> {
  const snapshot = getSnapshot();
  if (!snapshot) return;
  pointError.value = "";
  point.value = undefined;
  try {
    const response = await shopReq.point(snapshot.cookie);
    if (!isCurrent(snapshot)) return;
    checkResponse(response);
    point.value = response.data;
  } catch (error) {
    if (isCurrent(snapshot)) pointError.value = TGHttps.getErrMsg(error);
  }
}

async function loadGoods(append: boolean): Promise<void> {
  const snapshot = getSnapshot();
  if (!snapshot || (append && loading.value)) return;
  const version = ++listVersion;
  const game = selectedGame.value;
  const targetPage = append ? page.value + 1 : 1;
  loading.value = true;
  listError.value = "";
  appendError.value = false;
  if (!append) {
    goods.value = [];
    page.value = 0;
    hasMore.value = false;
  }
  try {
    const response = await shopReq.goods(snapshot.cookie, game, targetPage, pageSize);
    if (!isCurrent(snapshot) || version !== listVersion) return;
    checkResponse(response);
    const data = response.data;
    if (data.games?.length) categories.value = data.games;
    const existingIds = new Set(append ? goods.value.map((item) => item.goods_id) : []);
    const nextGoods = data.list.filter((item) => {
      if (existingIds.has(item.goods_id)) return false;
      existingIds.add(item.goods_id);
      return true;
    });
    goods.value = append ? [...goods.value, ...nextGoods] : nextGoods;
    page.value = targetPage;
    hasMore.value =
      data.list.length > 0 && nextGoods.length > 0 && targetPage * pageSize < data.total;
  } catch (error) {
    if (isCurrent(snapshot) && version === listVersion) {
      appendError.value = append;
      listError.value = TGHttps.getErrMsg(error);
    }
  } finally {
    if (isCurrent(snapshot) && version === listVersion) {
      loading.value = false;
      void nextTick(maybeLoadMore);
    }
  }
}

function selectCategory(game: string): void {
  if (selectedGame.value === game || exchanging.value) return;
  selectedGame.value = game;
  void loadGoods(false);
}

function selectGoodsType(type: GoodsTypeFilter): void {
  if (selectedGoodsType.value === type || exchanging.value) return;
  selectedGoodsType.value = type;
  listError.value = "";
  appendError.value = false;
  void nextTick(maybeLoadMore);
}

function selectStock(stock: StockFilter): void {
  if (selectedStock.value === stock || exchanging.value) return;
  selectedStock.value = stock;
  listError.value = "";
  appendError.value = false;
  void nextTick(maybeLoadMore);
}

function retryGoods(): void {
  void loadGoods(appendError.value && page.value > 0);
}

function handleCatalogScroll(event: Event): void {
  const target = event.currentTarget;
  if (!(target instanceof HTMLElement)) return;
  if (target.scrollTop + target.clientHeight >= target.scrollHeight - 64) maybeLoadMore();
}

function maybeLoadMore(): void {
  const catalog = shopCatalog.value;
  if (!catalog || !hasMore.value || loading.value || !!listError.value || exchanging.value) return;
  const noMatch = visibleGoods.value.length === 0;
  const notScrollable = catalog.scrollHeight <= catalog.clientHeight + 64;
  const nearBottom = catalog.scrollTop + catalog.clientHeight >= catalog.scrollHeight - 64;
  if (noMatch || notScrollable || nearBottom) void loadGoods(true);
}

async function refresh(): Promise<void> {
  needsVerification.value = false;
  await Promise.all([loadPoint(), loadGoods(false)]);
}

async function openDetail(item: TGApp.BBS.Shop.Goods): Promise<void> {
  const snapshot = getSnapshot();
  if (!snapshot || exchanging.value) return;
  if (detailLoading.value && detailRequestGoodsId.value === item.goods_id) return;
  if (detailOpen.value && detail.value?.goods_id === item.goods_id) return;
  const version = ++detailVersion;
  detail.value = undefined;
  roles.value = [];
  roleKey.value = undefined;
  rolesError.value = "";
  exchangeSucceeded.value = false;
  detailOpen.value = false;
  detailLoading.value = true;
  detailRequestGoodsId.value = item.goods_id;
  try {
    const response = await shopReq.detail(snapshot.cookie, item.goods_id);
    if (!isCurrent(snapshot) || version !== detailVersion) return;
    checkResponse(response);
    detail.value = response.data;
    if (response.data.game !== "bbs" && response.data.type !== 1) {
      try {
        const roleResponse = await takumiReq.bind.gameRoles(snapshot.cookie);
        if (!isCurrent(snapshot) || version !== detailVersion) return;
        checkResponse(roleResponse);
        const gameBiz = response.data.game_biz;
        roles.value = gameBiz
          ? roleResponse.data.list.filter((role) => role.game_biz === gameBiz)
          : [];
        if (!roles.value.length) rolesError.value = "这个账号尚未绑定可接收该商品的游戏角色。";
      } catch (error) {
        if (isCurrent(snapshot) && version === detailVersion) {
          rolesError.value = TGHttps.getErrMsg(error);
        }
      }
    }
    if (isCurrent(snapshot) && version === detailVersion) detailOpen.value = true;
  } catch (error) {
    if (isCurrent(snapshot) && version === detailVersion) {
      detail.value = undefined;
      showSnackbar.error(TGHttps.getErrMsg(error));
    }
  } finally {
    if (isCurrent(snapshot) && version === detailVersion) {
      detailLoading.value = false;
      detailRequestGoodsId.value = undefined;
    }
  }
}

function prepareExchange(): void {
  const snapshot = getSnapshot();
  if (!snapshot || !detail.value || !canExchange.value) return;
  if (!matchesCurrentAccount(snapshot)) {
    showSnackbar.error("登录账号已变更，请刷新商店后重新选择商品。");
    return;
  }
  const role = selectedRole.value;
  pendingExchange.value = {
    snapshot,
    goods: { ...detail.value },
    role: role ? { ...role } : undefined,
    recipient:
      detail.value.game === "bbs"
        ? `${briefInfo.value.nickname}（${maskUidTail(snapshot.uid)}）`
        : (roleOptions.value.find((item) => item.key === roleKey.value)?.label ?? ""),
  };
  confirmOpen.value = true;
}

async function exchange(): Promise<void> {
  const pending = pendingExchange.value;
  if (!pending || exchanging.value) return;
  const { snapshot } = pending;
  if (!isCurrent(snapshot) || !matchesCurrentAccount(snapshot) || !canExchange.value) {
    confirmOpen.value = false;
    showSnackbar.error("账号或商品状态已变更，请刷新后重新选择。");
    return;
  }
  exchanging.value = true;
  let responseReceived = false;
  let requestSent = false;
  try {
    const params = buildShopExchangeParams(pending.goods, snapshot.cookie, pending.role);
    requestSent = true;
    const response = await shopReq.exchange(snapshot.cookie, params);
    responseReceived = true;
    if (!isCurrent(snapshot) || !matchesCurrentAccount(snapshot)) return;
    checkResponse(response);
    exchangeSucceeded.value = true;
    showSnackbar.success(`兑换成功，订单号：${response.data.order_sn}`, 3000);
    await refresh();
  } catch (error) {
    if (requestSent && !responseReceived) {
      uncertainGoods.value = [...uncertainGoods.value, `${snapshot.uid}:${pending.goods.goods_id}`];
    }
    if (isCurrent(snapshot)) {
      const uncertain = exchangeUncertain.value;
      const message = TGHttps.getErrMsg(error);
      showSnackbar.error(
        uncertain ? `${message} 请求结果未确认，请先到官方商店核对兑换记录。` : message,
        uncertain ? 3000 : undefined,
      );
      await Promise.all([loadPoint(), loadGoods(false)]);
    }
  } finally {
    exchanging.value = false;
    if (isCurrent(snapshot)) confirmOpen.value = false;
  }
}

async function openOfficial(): Promise<void> {
  try {
    await TGClient.open(
      "community_shop",
      "https://webstatic.mihoyo.com/app/community-shop/index.html",
    );
  } catch (error) {
    showSnackbar.error(`打开官方商店失败：${TGHttps.getErrMsg(error)}`);
  }
}

watch(
  [uid, cookie, isLogin],
  () => {
    sessionVersion += 1;
    listVersion += 1;
    detailVersion += 1;
    point.value = undefined;
    pointError.value = "";
    goods.value = [];
    categories.value = [];
    selectedGame.value = "all";
    selectedGoodsType.value = "all";
    selectedStock.value = "all";
    loading.value = false;
    listError.value = "";
    appendError.value = false;
    detailOpen.value = false;
    confirmOpen.value = false;
    detail.value = undefined;
    detailLoading.value = false;
    detailRequestGoodsId.value = undefined;
    pendingExchange.value = undefined;
    needsVerification.value = false;
    if (canLoad.value) void refresh();
  },
  { immediate: true, deep: true, flush: "sync" },
);

onMounted(() => {
  if (!gameList.value.length) void bbsStore.refreshGameList();
  void nextTick(maybeLoadMore);
});

onBeforeUnmount(() => {
  sessionVersion += 1;
});
</script>

<style lang="scss" scoped>
.community-shop {
  position: relative;
  display: flex;
  overflow: hidden;
  width: 100%;
  max-width: 1200px;
  height: 100%;
  min-height: 0;
  box-sizing: border-box;
  flex-direction: column;
  margin: 0 auto;
  color: var(--app-page-content);
  font-size: 14px;
  gap: 8px;
  line-height: 20px;
}

.shop-header {
  position: relative;
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  align-items: center;
  padding: 24px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
  gap: 24px;

  h1 {
    margin: 0;
    font-family: var(--font-title);
    font-size: 28px;
    font-weight: normal;
  }

  p {
    margin: 0;
  }
}

.shop-balance {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin-left: auto;

  strong {
    display: inline-flex;
    align-items: center;
    color: var(--common-text-title);
    font-size: 24px;
    line-height: 32px;
  }
}

.shop-balance-icon {
  width: 28px;
  height: 28px;
}

.shop-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.shop-filters {
  display: flex;
  min-width: 0;
  flex-shrink: 0;
  align-items: center;
  gap: 12px;
  overflow-x: auto;
}

.shop-filter-group {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 12px;
}

.shop-filter-label {
  color: var(--box-text-2);
  font-family: var(--font-title);
  font-size: 14px;
  font-weight: normal;
  line-height: 20px;
  white-space: nowrap;
}

.shop-filter-toggle.v-btn-toggle {
  height: 36px;
  flex-shrink: 0;
  border-radius: 4px;
  background: var(--box-bg-1);

  :deep(.v-btn) {
    min-width: 44px;
    padding: 0 12px;
  }
}

.shop-category-icon {
  width: 20px;
  height: 20px;
  object-fit: contain;
}

.shop-catalog {
  min-width: 0;
  min-height: 0;
  flex: 1 1 0;
  padding: 4px;
  overflow-y: auto;
  scrollbar-gutter: stable;
}

.shop-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fill, minmax(min(220px, 100%), 1fr));
}

.shop-state,
.shop-pagination {
  padding: 24px 0;
  text-align: center;
}

.shop-pagination {
  color: var(--box-text-2);
  font-size: 12px;
}

@media (width <= 640px) {
  .community-shop {
    padding: 16px;
  }

  .shop-header {
    padding: 16px;
    gap: 16px;
  }

  .shop-actions {
    width: 100%;
  }
}
</style>
