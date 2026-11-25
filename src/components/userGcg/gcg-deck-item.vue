<template>
  <li class="gcg-deck-item" @click="emit('open', deck)">
    <ul aria-label="出战角色牌" class="gcg-deck-covers">
      <li v-for="slot in 3" :key="slot" class="gcg-deck-cover">
        <img
          v-if="getAvatarCard(slot - 1)?.image || getAvatarCard(slot - 1)?.icon"
          :alt="getAvatarCard(slot - 1)?.name"
          :src="getAvatarCard(slot - 1)?.image || getAvatarCard(slot - 1)?.icon"
          loading="lazy"
        />
        <v-icon v-else aria-label="空卡位" icon="mdi-cards-outline" />
      </li>
    </ul>
    <button
      :aria-label="`查看${deck.name || '未命名牌组'}详情`"
      class="gcg-deck-name"
      type="button"
      @click.stop="emit('open', deck)"
    >
      <strong>{{ deck.name || "未命名牌组" }}</strong>
      <span v-if="winCnt !== undefined">{{ winCnt }} 胜</span>
      <span v-else-if="deck.is_valid === false">未满足出战要求</span>
    </button>
  </li>
</template>

<script lang="ts" setup>
/** 七圣召唤牌组列表项。 @since Beta v0.14.1 */
type GcgDeckItemProps = {
  deck: TGApp.Game.Gcg.Deck;
  winCnt?: number;
};

const { deck, winCnt } = defineProps<GcgDeckItemProps>();
const emit = defineEmits<{ open: [deck: TGApp.Game.Gcg.Deck] }>();

function getAvatarCard(slot: number): TGApp.Game.Gcg.Card | undefined {
  return deck.avatar_cards?.[slot];
}
</script>

<style lang="scss" scoped>
.gcg-deck-item {
  display: grid;
  width: min(240px, 100%);
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--app-page-bg);
  cursor: pointer;
  gap: 12px;
}

.gcg-deck-item:hover {
  border-color: var(--common-shadow-2);
}

.gcg-deck-item:active {
  border-color: var(--common-shadow-4);
}

.gcg-deck-covers {
  display: grid;
  padding: 0;
  margin: 0;
  gap: 4px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  list-style: none;
}

.gcg-deck-cover {
  display: grid;
  overflow: hidden;
  min-width: 0;
  border-radius: 4px;
  aspect-ratio: 7 / 12;
  background: var(--box-bg-3);
  place-items: center;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
}

.gcg-deck-name {
  display: grid;
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--common-text-title);
  cursor: pointer;
  font: inherit;
  gap: 4px;
  overflow-wrap: anywhere;
  text-align: center;

  span {
    color: var(--box-text-2);
    font-size: 12px;
  }
}
</style>
