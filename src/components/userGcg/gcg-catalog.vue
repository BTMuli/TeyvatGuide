<template>
  <div v-if="loading" class="card-wiki-status" role="status">
    <v-progress-circular indeterminate size="24" />
    <p>正在加载卡牌…</p>
  </div>
  <div v-else-if="error" class="card-wiki-status" role="status">
    <p>{{ error }}</p>
    <v-btn type="button" variant="outlined" @click="retry">重试</v-btn>
  </div>
  <p v-else-if="cards.length === 0" class="card-wiki-status" role="status">暂无符合条件的卡牌</p>
  <template v-else>
    <GcgCatalogGrid :cards @select="openCard" />
  </template>
  <TwgCardDetail v-model="showDetail" :card="selectedCard" />
</template>

<script lang="ts" setup>
import TwgCardDetail from "@comp/pageWiki/twg-card-detail.vue";
import GcgCatalogGrid from "@comp/userGcg/gcg-catalog-grid.vue";
import cardSquareReq from "@req/cardSquareReq.js";
import TGHttps from "@utils/network/TGHttps.js";
import { computed, onMounted, ref, shallowRef, watch } from "vue";

/** 图鉴筛选与搜索条件。 @since Beta v0.14.1 */
type GcgCatalogProps = {
  tab: TGApp.Game.CardSquare.CardTab;
  search: string;
  selection: TGApp.Game.CardSquare.CatalogSelection;
};

const { tab, search, selection } = defineProps<GcgCatalogProps>();
const filters = defineModel<TGApp.Game.CardSquare.Filters | undefined>("filters", {
  required: true,
});
const roles = shallowRef<Array<TGApp.Game.CardSquare.RoleCard>>([]);
const actions = shallowRef<Array<TGApp.Game.CardSquare.ActionCard>>([]);
const catalogLoading = ref<boolean>(true);
const catalogError = ref<string>("");
const actionLoading = ref<boolean>(false);
const actionError = ref<string>("");
const actionOpened = ref<boolean>(false);
const actionRetry = ref<number>(0);
const selectedCard = shallowRef<TGApp.Game.CardSquare.Card>();
const showDetail = ref<boolean>(false);

// 查询图鉴行动牌时传入完整角色牌池，包含各角色天赋和元素共鸣牌。
const roleIds = computed<Array<number>>(() => roles.value.map((card) => card.basic.item_id));
const actionQuery = computed<TGApp.Game.CardSquare.ActionFilters | undefined>(() => {
  if (!actionOpened.value || !filters.value) return undefined;
  return {
    role_ids: roleIds.value,
    type_id: selection.actionType ?? undefined,
    tag_id: selection.actionTag ?? undefined,
    cost_id: selection.actionCost ?? undefined,
  };
});
const filteredCards = computed<Array<TGApp.Game.CardSquare.Card>>(() => {
  if (tab === "action") return actions.value;
  if (selection.element === null) return roles.value;
  return roles.value.filter((card) => card.element === selection.element);
});
const cards = computed<Array<TGApp.Game.CardSquare.Card>>(() => {
  if (!search) return filteredCards.value;
  return filteredCards.value.filter((card) => card.basic.name.toLocaleLowerCase().includes(search));
});
const loading = computed<boolean>(
  () => catalogLoading.value || (tab === "action" && actionLoading.value),
);
const error = computed<string>(
  () => catalogError.value || (tab === "action" ? actionError.value : ""),
);

onMounted(loadCatalog);

watch(
  () => tab,
  (value) => {
    if (value === "action") actionOpened.value = true;
  },
  { immediate: true },
);

watch([actionQuery, actionRetry], async ([query], _, onCleanup) => {
  if (!query) return;
  let stale = false;
  onCleanup(() => {
    stale = true;
  });

  actionLoading.value = true;
  actionError.value = "";
  try {
    const data = await cardSquareReq.actions(query);
    if (!stale) actions.value = data;
  } catch (cause) {
    if (!stale) actionError.value = `加载行动牌失败：${TGHttps.getErrMsg(cause)}`;
  } finally {
    if (!stale) actionLoading.value = false;
  }
});

async function loadCatalog(): Promise<void> {
  catalogLoading.value = true;
  catalogError.value = "";
  try {
    const [roleCards, filterOptions] = await Promise.all([
      cardSquareReq.roles(),
      cardSquareReq.filters(),
    ]);
    roles.value = roleCards;
    filters.value = filterOptions;
  } catch (cause) {
    catalogError.value = `加载卡牌图鉴失败：${TGHttps.getErrMsg(cause)}`;
  } finally {
    catalogLoading.value = false;
  }
}

function retry(): void {
  if (catalogError.value) void loadCatalog();
  else actionRetry.value++;
}

function openCard(card: TGApp.Game.CardSquare.Card): void {
  selectedCard.value = card;
  showDetail.value = true;
}
</script>

<style lang="scss" scoped>
.card-wiki-status {
  display: flex;
  min-height: 160px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px;
  gap: 12px;
  text-align: center;
}
</style>
