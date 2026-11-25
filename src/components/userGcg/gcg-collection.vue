<template>
  <section aria-label="我的牌组与收藏" class="gcg-collection">
    <div v-if="activeError" class="gcg-feedback" role="status">
      <p>{{ activeError }}</p>
      <v-btn size="small" type="button" variant="outlined" @click="retryActive">重试</v-btn>
    </div>

    <div v-if="section === 'decks'" class="gcg-panel">
      <div v-if="deckLoading" aria-live="polite" class="gcg-state">正在加载牌组…</div>
      <GcgDecks
        v-else-if="deckError === undefined && (filteredDecks.length > 0 || decks.length === 0)"
        :account
        :cookie
        :decks="filteredDecks"
      />
      <div v-else-if="deckError === undefined" class="gcg-state">暂无匹配牌组</div>
    </div>

    <div v-else-if="section === 'cards'" class="gcg-panel">
      <div v-if="cardLoading && cards.length === 0" aria-live="polite" class="gcg-state">
        正在加载卡牌…
      </div>
      <div v-else-if="!cardError && cards.length === 0" class="gcg-state">暂无卡牌数据</div>
      <template v-else-if="cards.length > 0">
        <ul v-if="filteredCards.length > 0" class="gcg-card-grid">
          <li v-for="card in filteredCards" :key="card.id" @click="openCard(card)">
            <TwgCardTile
              :card
              :dimmed="!isCardCollected(card)"
              showDetails
              @open-details="openCard(card)"
            >
              <template #detailsMeta>
                <span
                  :aria-label="isCardCollected(card) ? '已收集 ' + card.num + ' 张' : '未收集'"
                  :title="isCardCollected(card) ? '已收集 ' + card.num + ' 张' : '未收集'"
                  role="img"
                >
                  <template v-if="isCardCollected(card)">×{{ card.num }}</template>
                  <v-icon v-else aria-hidden="true" icon="mdi-lock-outline" size="14" />
                </span>
              </template>
            </TwgCardTile>
          </li>
        </ul>
        <div v-else class="gcg-state">暂无匹配卡牌</div>
        <div v-if="!cardError && !cardsFinished" class="gcg-load-more">
          <v-btn :loading="cardLoading" type="button" variant="tonal" @click="loadCards()">
            加载更多
          </v-btn>
        </div>
      </template>
      <TwgCardDetail v-model="showCardDetail" :card="selectedCard" />
    </div>

    <div v-else class="gcg-panel">
      <div v-if="backLoading" aria-live="polite" class="gcg-state">正在加载牌背…</div>
      <div v-else-if="!backError && backs.length === 0" class="gcg-state">暂无牌背数据</div>
      <div v-else-if="!backError && backs.length > 0" class="gcg-back-grid">
        <article
          v-for="back in backs"
          :key="back.id"
          :aria-label="back.has_obtained ? '已获得牌背' : '未获得牌背'"
          :class="{ locked: !back.has_obtained }"
          class="gcg-back-tile"
        >
          <img :src="back.image_v2 || back.image" alt="" loading="lazy" />
          <v-icon
            v-if="!back.has_obtained"
            aria-hidden="true"
            class="gcg-back-lock"
            icon="mdi-lock-outline"
            size="28"
          />
        </article>
      </div>
    </div>
  </section>
</template>

<script lang="ts" setup>
import TwgCardDetail from "@comp/pageWiki/twg-card-detail.vue";
import TwgCardTile from "@comp/pageWiki/twg-card-tile.vue";
import recordReq from "@req/recordReq.js";
import TGHttps from "@utils/network/TGHttps.js";
import { computed, ref, shallowRef, watch } from "vue";

import GcgDecks from "./gcg-decks.vue";

/** 七圣召唤收藏所用账号。 @since Beta v0.14.1 */
type GcgCollectionProps = {
  account: TGApp.Sqlite.Account.Game;
  cookie: TGApp.App.Account.Cookie;
  section: TGApp.Game.Gcg.CollectionTab;
  cardFilter: TGApp.Game.Gcg.CardFilter;
  search: string;
};

const { account, cookie, section, cardFilter, search } = defineProps<GcgCollectionProps>();

const decks = shallowRef<Array<TGApp.Game.Gcg.DeckRecord>>([]);
const cards = shallowRef<Array<TGApp.Game.Gcg.Card>>([]);
const selectedCard = shallowRef<TGApp.Game.Gcg.Card>();
const showCardDetail = ref<boolean>(false);
const backs = shallowRef<Array<TGApp.Game.Gcg.CardBack>>([]);
const deckLoading = ref<boolean>(false);
const cardLoading = ref<boolean>(false);
const backLoading = ref<boolean>(false);
const deckError = ref<string>();
const cardError = ref<string>();
const backError = ref<string>();
const cardsFinished = ref<boolean>(false);
const cardOffset = ref<number | string>(0);
let decksLoaded = false;
let cardLoadSequence = 0;
let cardRequestFilter: TGApp.Game.Gcg.CardFilter | undefined;
let cardsLoadedFilter: TGApp.Game.Gcg.CardFilter | undefined;
let backsLoaded = false;

const activeError = computed<string | undefined>(
  () => ({ decks: deckError.value, cards: cardError.value, backs: backError.value })[section],
);

const filteredDecks = computed<Array<TGApp.Game.Gcg.DeckRecord>>(() =>
  decks.value.filter(({ deck }) => matchesSearch(deck.name || "未命名牌组")),
);
const filteredCards = computed<Array<TGApp.Game.Gcg.Card>>(() =>
  cards.value.filter((card) => matchesSearch(card.name)),
);

watch(
  [() => section, () => cardFilter],
  ([currentSection, currentCardFilter], previousValues) => {
    if (currentSection !== previousValues?.[0]) showCardDetail.value = false;
    const filterChanged = currentCardFilter !== previousValues?.[1];
    if (currentSection === "decks") {
      if (!decksLoaded && !deckLoading.value) void loadDecks();
      return;
    }
    if (currentSection === "backs") {
      if (!backsLoaded && !backLoading.value) void loadBacks();
      return;
    }
    if (
      filterChanged ||
      (cardsLoadedFilter !== currentCardFilter && cardRequestFilter !== currentCardFilter)
    ) {
      void loadCards(true);
    }
  },
  { immediate: true },
);

function getErrorMessage(error: unknown): string {
  return `加载七圣召唤数据失败：${TGHttps.getErrMsg(error)}`;
}

function matchesSearch(value: string | null | undefined): boolean {
  return !search || (value?.toLocaleLowerCase().includes(search) ?? false);
}

async function loadDecks(): Promise<void> {
  if (deckLoading.value) return;
  deckLoading.value = true;
  deckError.value = undefined;
  try {
    const response = await recordReq.gcg(cookie, account, "deckList");
    decks.value = (response.deck_list ?? []).map((deck) => ({ deck }));
    decksLoaded = true;
  } catch (error) {
    decksLoaded = false;
    deckError.value = getErrorMessage(error);
  } finally {
    deckLoading.value = false;
  }
}

async function loadCards(reset: boolean = false): Promise<void> {
  if ((!reset && cardLoading.value) || (!reset && cardsFinished.value)) return;
  const sequence = ++cardLoadSequence;
  const requestFilter = cardFilter;
  cardRequestFilter = requestFilter;
  cardLoading.value = true;
  cardError.value = undefined;
  const offset = reset ? 0 : cardOffset.value;
  if (reset) {
    cards.value = [];
    cardOffset.value = 0;
    cardsFinished.value = false;
    cardsLoadedFilter = undefined;
  }
  try {
    const response = await recordReq.gcg(cookie, account, "cardList", {
      need_stats: true,
      limit: 50,
      need_avatar: requestFilter !== "action",
      need_action: requestFilter !== "avatar",
      offset,
    });
    if (sequence !== cardLoadSequence || requestFilter !== cardFilter) return;
    const newCards = response.card_list ?? [];
    cards.value = reset ? newCards : [...cards.value, ...newCards];
    const nextOffset = response.next_offset;
    cardOffset.value = nextOffset ?? offset;
    cardsFinished.value =
      response.is_last === true ||
      nextOffset == null ||
      String(nextOffset) === String(offset) ||
      newCards.length === 0;
    cardsLoadedFilter = requestFilter;
  } catch (error) {
    if (sequence !== cardLoadSequence || requestFilter !== cardFilter) return;
    cardError.value = getErrorMessage(error);
  } finally {
    if (sequence === cardLoadSequence) {
      cardLoading.value = false;
      cardRequestFilter = undefined;
    }
  }
}

async function loadBacks(): Promise<void> {
  if (backLoading.value) return;
  backLoading.value = true;
  backError.value = undefined;
  try {
    const response = await recordReq.gcg(cookie, account, "cardBackList");
    backs.value = response.card_back_list ?? [];
    backsLoaded = true;
  } catch (error) {
    backsLoaded = false;
    backError.value = getErrorMessage(error);
  } finally {
    backLoading.value = false;
  }
}

function openCard(card: TGApp.Game.Gcg.Card): void {
  selectedCard.value = card;
  showCardDetail.value = true;
}

function isCardCollected(card: TGApp.Game.Gcg.Card): boolean {
  return (card.num ?? 0) > 0;
}

function retryActive(): void {
  if (section === "decks") void loadDecks();
  if (section === "cards") void loadCards(cards.value.length === 0);
  if (section === "backs") void loadBacks();
}
</script>

<style lang="scss" scoped>
.gcg-collection {
  display: flex;
  min-height: 360px;
  flex-direction: column;
  color: var(--box-text-1);
  gap: 16px;
}

.gcg-panel {
  min-height: 240px;
}

.gcg-card-grid {
  display: grid;
  justify-content: center;
  padding: 12px 24px 0;
  margin: 0;
  gap: 16px 36px;
  grid-template-columns: repeat(auto-fit, min(140px, 100%));
  list-style: none;

  > li {
    cursor: pointer;
  }
}

.gcg-back-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
}

.gcg-back-tile {
  position: relative;
  min-width: 0;
  aspect-ratio: 7 / 12;

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  &.locked img {
    opacity: 0.55;
  }
}

.gcg-back-lock {
  position: absolute;
  top: 50%;
  left: 50%;
  color: var(--common-text-title);
  filter: drop-shadow(0 1px 2px var(--app-page-bg));
  transform: translate(-50%, -50%);
}

.gcg-load-more {
  display: flex;
  justify-content: center;
  padding-top: 20px;
}

.gcg-state {
  display: flex;
  min-height: 160px;
  align-items: center;
  justify-content: center;
  color: var(--box-text-2);
  font-size: 14px;
}

.gcg-feedback {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
}

@media (width <= 600px) {
  .gcg-back-grid {
    gap: 8px;
    grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  }
}
</style>
