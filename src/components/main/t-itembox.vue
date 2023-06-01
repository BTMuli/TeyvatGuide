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

const getSize = computed(() => {
  return props.size === "100px" ? "30px" : "40px";
});

const getHeight = computed(() => {
  return props.display === "inner" ? props.size : `${props.size.slice(0, -2) + 20}px`;
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
  width: 100%;
  height: 100%;
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
  width: 100%;
  height: 100%;
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
  width: v-bind(getSize);
  height: v-bind(getSize);
  display: flex;
  justify-content: center;
  align-items: center;
}

.tib-lt img {
  width: calc(v-bind(getSize) - 10px);
  height: calc(v-bind(getSize) - 10px);
  object-fit: cover;
}

.tib-inner {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: v-bind(getSize);
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgb(20 20 20 / 50%);
  border-bottom-left-radius: 5px;
  border-bottom-right-radius: 5px;
  color: #fff;
  font-size: calc(v-bind(getSize) / 3);
  text-shadow: 0 0 5px #000;
  font-family: Genshin, serif;
}

.tib-inner img {
  width: calc(v-bind(getSize) / 1.5);
  height: calc(v-bind(getSize) / 1.5);
  margin-right: 5px;
}
</style>
