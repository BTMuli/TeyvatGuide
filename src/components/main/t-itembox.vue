<template>
  <div class="tib-box">
    <div class="tib-bg">
      <slot name="bg">
        <img :src="card.bg" alt="bg">
      </slot>
    </div>
    <div class="tib-icon">
      <slot name="icon">
        <img :src="card.icon" alt="icon">
      </slot>
    </div>
    <div class="tib-cover">
      <div class="tib-lt">
        <img :src="card.lt" alt="lt">
      </div>
      <div v-show="card.rt" class="tib-rt">
        {{ card.rt }}
      </div>
      <div v-show="props.display==='inner'" class="tib-inner">
        <slot name="inner-icon">
          <img v-show="card.innerIcon" :src="card.innerIcon" alt="inner-icon">
        </slot>
        <slot name="inner-text">
          <span>{{ card.innerText }}</span>
        </slot>
      </div>
      <div v-show="props.display==='outer'" class="tib-outer">
        <slot name="outer-icon">
          <img v-show="card.outerIcon" :src="card.outerIcon" alt="outer-icon">
        </slot>
        <slot name="outer-text">
          <span>{{ card.outerText }}</span>
        </slot>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
// vue
import { computed, ComputedRef } from "vue";
// types
import { TibAbyssOverviewAvatar } from "../itembox/tib-abyss-overview.vue";
import { TibAbyssDetailAvatar } from "../itembox/tib-abyss-detail.vue";

interface TItemBoxProps {
  modelValue: string
  data: Record<string, string | number>,
  display: "inner" | "outer",
  size: string,
}

interface TItemBoxCard {
  bg: string,
  icon: string,
  lt: string,
  rt?: string,
  innerIcon?: string,
  innerText?: string,
  outerIcon?: string,
  outerText?: string,
}

const props = defineProps<TItemBoxProps>();

const getHeight = computed(() => {
  return props.display === "inner" ? props.size : `${Number(props.size.slice(0, -2)) + 20}px`;
});

const card: ComputedRef<TItemBoxCard> = computed(() => {
  let cardData;
  switch (props.modelValue) {
    case "calendar-avatar":
      cardData = props.data as TGApp.App.Calendar.Item;
      return {
        bg: cardData.bg,
        icon: cardData.icon,
        lt: cardData.elementIcon,
        innerIcon: cardData.weaponIcon,
        innerText: cardData.name,
      } as TItemBoxCard;
    case "calendar-weapon":
      cardData = props.data as TGApp.App.Calendar.Item;
      return {
        bg: cardData.bg,
        icon: cardData.icon,
        lt: cardData.weaponIcon,
        innerText: cardData.name,
      } as TItemBoxCard;
    case "wiki-avatar":
      cardData = props.data as TGApp.App.Character.WikiBriefInfo;
      return {
        bg: `/icon/bg/${cardData.star}-Star.webp`,
        icon: `/WIKI/character/icon/${cardData.id}.webp`,
        lt: `/icon/element/${cardData.element}元素.webp`,
        innerIcon: `/icon/weapon/${cardData.weapon}.webp`,
        innerText: cardData.name,
      } as TItemBoxCard;
    case "wiki-weapon":
      cardData = props.data as TGApp.App.Weapon.WikiBriefInfo;
      return {
        bg: cardData.bg,
        icon: cardData.icon,
        lt: cardData.weaponIcon,
        innerText: cardData.name,
      } as TItemBoxCard;
    case "abyss-overview":
      cardData = props.data as TibAbyssOverviewAvatar;
      return {
        bg: `/icon/bg/${cardData.star}-Star.webp`,
        icon: `/WIKI/character/icon/${cardData.id}.webp`,
        lt: `/icon/element/${cardData.element}元素.webp`,
        innerText: cardData.value,
      } as TItemBoxCard;
    case "abyss-detail":
      cardData = props.data as TibAbyssDetailAvatar;
      return {
        bg: `/icon/bg/${cardData.star}-Star.webp`,
        icon: `/WIKI/character/icon/${cardData.id}.webp`,
        lt: `/icon/element/${cardData.element}元素.webp`,
        innerText: `Lv.${cardData.value}`,
      } as TItemBoxCard;
  }
});

</script>
<style lang="css" scoped>
.tib-box {
  position: relative;
  width: v-bind(size);
  height: v-bind(getHeight);
  cursor: pointer;
}

.tib-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 5px;
  overflow: hidden;
}

.tib-bg img {
  width: v-bind(size);
  height: v-bind(size);
  object-fit: cover;
}

.tib-icon {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 5px;
}

.tib-icon img {
  width: v-bind(size);
  height: v-bind(size);
  object-fit: cover;
}

.tib-cover {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 5px;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
}

.tib-lt {
  position: absolute;
  top: 0;
  left: 0;
  width: 30px;
  height: 30px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.tib-lt img {
  width: 20px;
  height: 20px;
  object-fit: cover;
}

.tib-inner {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgb(20 20 20 / 50%);
  border-bottom-left-radius: 5px;
  border-bottom-right-radius: 5px;
  color: #fff;
  font-size: 8px;
  text-shadow: 0 0 5px #000;
  font-family: Genshin, serif;
}

.tib-inner img {
  width: 20px;
  height: 20px;
  margin-right: 5px;
}

.tib-outer {
  position: absolute;
  bottom: 0;
  border-bottom-left-radius: 5px;
  border-bottom-right-radius: 5px;
  width: 100%;
  height: 20px;
  background: rgb(0 0 0/ 20%);
  display: flex;
  justify-content: center;
  align-items: center;
  font-family: Genshin, serif;
  color: #fff;
  font-size: 8px;
  text-shadow: 0 0 5px #000;
}
</style>
