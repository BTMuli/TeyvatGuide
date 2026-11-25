<template>
  <p v-if="decks.length === 0">{{ scheduleId === undefined ? "暂无牌组" : "暂无使用牌组记录" }}</p>
  <ul v-else class="gcg-deck-list">
    <GcgDeckItem
      v-for="{ deck, win_cnt } in decks"
      :key="deck.id"
      :deck
      :winCnt="win_cnt"
      @open="openDeck"
    />
  </ul>

  <TopOverlay
    v-model="showDeck"
    :showShare="false"
    :titleId
    closeAriaLabel="关闭牌组详情"
    panelMaxHeight="calc(100dvh - var(--v-layout-top, 0px) - 32px)"
    panelWidth="min(760px, calc(100vw - 32px))"
    topOffset="var(--v-layout-top, 0px)"
  >
    <template #header>
      <h2 :id="titleId" class="gcg-deck-title">{{ currentDeck?.name || "牌组详情" }}</h2>
    </template>
    <div v-if="currentDeck" class="gcg-deck-detail">
      <p v-if="detailLoading" role="status">正在加载牌组详情…</p>
      <p v-if="detailError" role="status">{{ detailError }}</p>
      <p v-else-if="currentDeck.is_valid === false">未满足出战要求</p>
      <section v-for="group in cardGroups" :key="group.title">
        <h3>{{ group.title }}</h3>
        <p v-if="group.cards.length === 0 && !detailLoading && !detailError">
          暂无{{ group.title }}
        </p>
        <ul
          v-else-if="group.cards.length > 0"
          :class="{ 'action-cards': group.title === '行动牌' }"
          class="gcg-deck-cards"
        >
          <li v-for="card in group.cards" :key="card.id" @click="openCard(card)">
            <TwgCardTile :card showDetails @open-details="openCard(card)">
              <template v-if="card.num !== undefined" #detailsMeta>
                <span
                  :aria-label="'牌组内 ' + card.num + ' 张'"
                  :title="'牌组内 ' + card.num + ' 张'"
                  role="img"
                >
                  ×{{ card.num }}
                </span>
              </template>
            </TwgCardTile>
          </li>
        </ul>
      </section>
    </div>
    <template v-if="currentDeck?.share_code" #footer>
      <v-btn prepend-icon="mdi-content-copy" type="button" variant="flat" @click="copyShareCode">
        复制牌组分享码
      </v-btn>
    </template>
  </TopOverlay>

  <TwgCardDetail v-model="showCardDetail" :card="selectedCard" />
</template>

<script lang="ts" setup>
import TopOverlay from "@comp/app/top-overlay.vue";
import showSnackbar from "@comp/func/snackbar.js";
import TwgCardDetail from "@comp/pageWiki/twg-card-detail.vue";
import TwgCardTile from "@comp/pageWiki/twg-card-tile.vue";
import recordReq from "@req/recordReq.js";
import TGHttps from "@utils/network/TGHttps.js";
import { computed, ref, shallowRef, useId, watch } from "vue";

import GcgDeckItem from "./gcg-deck-item.vue";

/** 七圣召唤牌组列表及详情请求参数。 @since Beta v0.14.1 */
type GcgDecksProps = {
  account: TGApp.Sqlite.Account.Game;
  cookie: TGApp.App.Account.Cookie;
  decks: Array<TGApp.Game.Gcg.DeckRecord>;
  scheduleId?: number | string;
};

const { account, cookie, decks, scheduleId } = defineProps<GcgDecksProps>();
const titleId = useId();
const showDeck = ref<boolean>(false);
const showCardDetail = ref<boolean>(false);
const selectedCard = shallowRef<TGApp.Game.Gcg.Card>();
const selectedDeck = shallowRef<TGApp.Game.Gcg.Deck>();
const detailedDeck = shallowRef<TGApp.Game.Gcg.Deck>();
const detailLoading = ref<boolean>(false);
const detailError = ref<string>("");

const currentDeck = computed<TGApp.Game.Gcg.Deck | undefined>(
  () => detailedDeck.value ?? selectedDeck.value,
);
const cardGroups = computed<Array<{ title: string; cards: Array<TGApp.Game.Gcg.Card> }>>(() => {
  const deck = currentDeck.value;
  return [
    { title: "角色牌", cards: deck?.avatar_cards?.filter((card) => Number(card.id) !== 0) ?? [] },
    { title: "行动牌", cards: deck?.action_cards?.filter((card) => Number(card.id) !== 0) ?? [] },
  ];
});

watch([showDeck, selectedDeck], async ([open, deck], _, onCleanup) => {
  showCardDetail.value = false;
  selectedCard.value = undefined;
  detailedDeck.value = undefined;
  detailError.value = "";
  detailLoading.value = false;
  if (!open || !deck || deck.action_cards || deck.is_valid === false) return;

  const schedule = scheduleId;
  let stale = false;
  onCleanup(() => {
    stale = true;
  });
  detailLoading.value = true;
  try {
    const detail =
      schedule === undefined
        ? (await recordReq.gcg(cookie, account, "deckList", { deck_id: deck.id })).deck_list?.[0]
        : (
            await recordReq.gcg(cookie, account, "challenge/deck", {
              schedule_id: schedule,
              deck_id: deck.id,
            })
          ).deck_detail?.deck;
    if (stale) return;
    if (!detail) detailError.value = "暂无牌组详情";
    else detailedDeck.value = { ...deck, ...detail };
  } catch (cause) {
    if (!stale) detailError.value = `加载牌组详情失败：${TGHttps.getErrMsg(cause)}`;
  } finally {
    if (!stale) detailLoading.value = false;
  }
});

watch(
  () => scheduleId,
  () => {
    showDeck.value = false;
  },
);

function openDeck(deck: TGApp.Game.Gcg.Deck): void {
  selectedDeck.value = deck;
  showDeck.value = true;
}

function openCard(card: TGApp.Game.Gcg.Card): void {
  selectedCard.value = card;
  showCardDetail.value = true;
}

async function copyShareCode(): Promise<void> {
  const code = currentDeck.value?.share_code;
  if (!code) return;
  try {
    await navigator.clipboard.writeText(code);
    showSnackbar.success("已复制牌组分享码");
  } catch {
    showSnackbar.error("复制牌组分享码失败");
  }
}
</script>

<style lang="scss" scoped>
.gcg-deck-list,
.gcg-deck-cards {
  padding: 0;
  margin: 0;
  list-style: none;
}

.gcg-deck-list {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: center;
  gap: 16px;
}

.gcg-deck-detail {
  display: grid;
  gap: 12px;
}

.gcg-deck-title {
  font-family: var(--font-title);
  font-size: 20px;
  font-weight: normal;
}

.gcg-deck-detail {
  h3 {
    margin-bottom: 8px;
    font-size: 16px;
  }
}

.gcg-deck-cards {
  display: grid;
  justify-content: center;
  padding: 12px 24px 0;
  gap: 16px 36px;
  grid-template-columns: repeat(auto-fit, min(140px, 100%));

  li {
    min-width: 0;
    cursor: pointer;
  }
}

.gcg-deck-cards.action-cards {
  grid-template-columns: repeat(4, minmax(0, 140px));
}

@media (width <= 720px) {
  .gcg-deck-cards.action-cards {
    grid-template-columns: repeat(3, minmax(0, 140px));
  }
}

@media (width <= 520px) {
  .gcg-deck-cards.action-cards {
    grid-template-columns: repeat(2, minmax(0, 140px));
  }
}
</style>
