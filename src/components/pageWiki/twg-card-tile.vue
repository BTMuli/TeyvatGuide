<template>
  <div class="card-tile">
    <div class="card-tile-art">
      <div class="card-tile-frame">
        <img
          v-if="display.cover"
          :class="{ dimmed }"
          :src="display.cover"
          alt=""
          class="card-tile-cover"
          loading="lazy"
        />
      </div>
      <div v-if="display.badges.length" class="card-tile-badges">
        <span
          v-for="(badge, index) in display.badges"
          :key="index"
          :aria-label="`${badge.label} ${badge.amount}`"
          :title="`${badge.label} ${badge.amount}`"
          class="card-tile-badge"
          role="img"
        >
          <img :src="badge.icon" alt="" />
          <span>{{ badge.amount }}</span>
        </span>
      </div>
      <div v-if="showDetails || $slots.detailsMeta" class="card-tile-actions">
        <button
          v-if="showDetails"
          :aria-label="`查看${display.name}详情`"
          class="card-tile-details tg-icon-button"
          title="查看详情"
          type="button"
          @click.stop="emit('openDetails')"
        >
          <v-icon aria-hidden="true" icon="mdi-eye" size="16" />
        </button>
        <div v-if="$slots.detailsMeta" class="card-tile-status">
          <slot name="detailsMeta" />
        </div>
      </div>
    </div>
    <span v-if="!hideName" :title="display.name" class="card-tile-name">
      {{ display.name }}
    </span>
  </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";

/** 卡面的展示配置。 @since Beta v0.14.1 */
type TwgCardTileProps = {
  card: TGApp.Game.CardSquare.Card | TGApp.Game.Gcg.Card;
  dimmed?: boolean;
  hideName?: boolean;
  showDetails?: boolean;
};

const { card, dimmed, hideName, showDetails } = defineProps<TwgCardTileProps>();
const emit = defineEmits<{ openDetails: [] }>();

/** 卡面角标的图标、名称和显示数值。 @since Beta v0.14.1 */
type CardBadge = { icon: string; label: string; amount: number };

const costIconBase = "https://act-webstatic.mihoyo.com/hk4e/e20200928calculate/item_icon/67c7f719/";
const matchingCost = { icon: "/UI/gcg/cost-matching.webp", label: "相同元素骰" };
const costIcons: Readonly<Partial<Record<string, Omit<CardBadge, "amount">>>> = {
  "1": { icon: `${costIconBase}54f12c0eadb091b3d564408471387021.png`, label: "充能" },
  "3": matchingCost,
  "6": { icon: `${costIconBase}5bdbe64fa0b51912abf046d26f735401.png`, label: "秘传" },
  "10": { icon: "/UI/gcg/cost-unaligned.webp", label: "任意元素骰" },
  "11": { icon: `${costIconBase}412134fa7fc8a73b5e20c177a3ae0046.png`, label: "冰元素骰" },
  "12": { icon: `${costIconBase}aebd3583ff696429f2e8d83527149ce3.png`, label: "水元素骰" },
  "13": { icon: `${costIconBase}fe4517db495f28fdbcb44607d94640c3.png`, label: "火元素骰" },
  "14": { icon: `${costIconBase}0a7a50d15a7580c4de07a41f87a95787.png`, label: "雷元素骰" },
  "15": { icon: `${costIconBase}680e755181a0b8c29e87d0570815ac29.png`, label: "岩元素骰" },
  "16": { icon: `${costIconBase}848248aa7c40784633446db172ee4678.png`, label: "草元素骰" },
  "17": { icon: `${costIconBase}bff8d36c5fdb0df001e05624aa7b7e97.png`, label: "风元素骰" },
};

const recordCostTypes: Readonly<Partial<Record<string, string>>> = {
  CostTypeEnergy: "1",
  CostTypeSame: "3",
  CostTypeArcane: "6",
  CostTypeVoid: "10",
  CostTypeCryo: "11",
  CostTypeHydro: "12",
  CostTypePyro: "13",
  CostTypeElectro: "14",
  CostTypeGeo: "15",
  CostTypeDenro: "16",
  CostTypeAnemo: "17",
};

const display = computed<{ name: string; cover: string | undefined; badges: Array<CardBadge> }>(
  () => {
    if (!("basic" in card)) {
      return { name: card.name, cover: card.image || card.icon, badges: getCardBadges(card) };
    }
    return {
      name: card.basic.name,
      cover: card.basic.icon || card.basic.icon_small,
      badges: getCardBadges(card),
    };
  },
);

function getCardBadges(card: TwgCardTileProps["card"]): Array<CardBadge> {
  if (!("basic" in card)) {
    if (card.hp !== undefined && card.hp > 0) return [healthBadge(card.hp)];
    return (card.action_cost ?? []).map((cost) =>
      costBadge(recordCostTypes[cost.cost_type], cost.cost_value),
    );
  }
  if ("hp" in card) return [healthBadge(card.hp)];
  const badges = [costBadge(card.skill_element, card.skill_value)];
  if (card.skill_value2 > 0) badges.push(costBadge(card.skill_element2, card.skill_value2));
  return badges;
}

function healthBadge(amount: number): CardBadge {
  return { icon: "/UI/gcg/health.webp", label: "生命值", amount };
}

function costBadge(type: string | undefined, amount: number): CardBadge {
  const icon = type ? costIcons[type] : undefined;
  return { ...(icon ?? { icon: matchingCost.icon, label: "花费" }), amount };
}
</script>

<style lang="scss" scoped>
.card-tile {
  min-width: 0;
  line-height: 1.5;
}

.card-tile-art {
  position: relative;
}

.card-tile-frame {
  overflow: hidden;
  border: 1px solid var(--common-shadow-1);
  border-radius: 14px;
  aspect-ratio: 7 / 12;
  background: var(--box-bg-1);
}

.card-tile-cover {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;

  &.dimmed {
    opacity: 0.55;
  }
}

.card-tile-badges {
  position: absolute;
  top: -8px;
  left: 0;
  display: grid;
  gap: 2px;
  transform: translateX(-50%);
}

.card-tile-badge {
  position: relative;
  display: grid;
  width: 38px;
  height: 38px;
  color: var(--tgc-white-1);
  font-size: 16px;
  font-weight: 700;
  place-items: center;
  text-shadow:
    0 1px 2px var(--tgc-dark-8),
    1px 0 1px var(--tgc-dark-8),
    -1px 0 1px var(--tgc-dark-8),
    0 -1px 1px var(--tgc-dark-8);

  img {
    position: absolute;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  span {
    position: relative;
  }
}

.card-tile-actions {
  position: absolute;
  top: -5px;
  right: 0;
  display: grid;
  gap: 4px;
  justify-items: center;
  transform: translateX(50%);
}

.card-tile-details,
.card-tile-status {
  display: grid;
  width: 28px;
  height: 28px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 50%;
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  background: var(--common-shadow-1);
  color: var(--common-text-title);
  place-items: center;
}

.card-tile-details:hover {
  background: var(--common-shadow-2);
}

.card-tile-status {
  font-size: 11px;
  white-space: nowrap;
}

.card-tile-name {
  display: block;
  overflow: hidden;
  padding: 4px 0 0;
  color: var(--box-text-1);
  font-size: 13px;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
