<template>
  <div class="tib-box">
    <div class="tib-bg">
      <slot name="bg">
        <img :src="modelValue.bg" alt="bg">
      </slot>
    </div>
    <div class="tib-icon">
      <slot name="icon">
        <img :src="modelValue.icon" alt="icon">
      </slot>
    </div>
    <div class="tib-cover">
      <div class="tib-lt">
        <img :src="modelValue.lt" alt="lt">
      </div>
      <div v-show="modelValue.rt" class="tib-rt">
        {{ modelValue.rt }}
      </div>
      <div v-if="modelValue.display==='inner'" class="tib-inner">
        <slot name="inner-icon">
          <img v-show="modelValue.innerIcon" :src="modelValue.innerIcon" alt="inner-icon">
        </slot>
        <slot name="inner-text">
          <span>{{ modelValue.innerText }}</span>
        </slot>
      </div>
      <div v-if="modelValue.display==='outer'" class="tib-outer">
        <slot name="outer-icon">
          <img v-show="modelValue.outerIcon" :src="modelValue.outerIcon" alt="outer-icon">
        </slot>
        <slot name="outer-text">
          <span>{{ modelValue.outerText }}</span>
        </slot>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { computed } from "vue";

export interface TItemBoxData {
  bg: string,
  icon: string,
  size: string,
  height: string,
  display: "inner" | "outer",
  lt: string,
  ltSize: string,
  rt?: string,
  rtSize?: string,
  innerHeight?: number,
  innerIcon?: string,
  innerText?: string,
  outerHeight?: number,
  outerIcon?: string,
  outerText?: string,
}

interface TItemBoxProps {
  modelValue: TItemBoxData,
}

const props = withDefaults(defineProps<TItemBoxProps>(), {
  modelValue: {
    bg: "",
    icon: "",
    lt: "",
    ltSize: "30px",
    display: "inner",
    size: "80px",
    height: "80px",
  },
});

const getInnerHeight = computed(() => `${props.modelValue.innerHeight}px`);
const getInnerFont = computed(() => `${props.modelValue.innerHeight / 2}px`);
const getOuterHeight = computed(() => `${props.modelValue.outerHeight}px`);
const getOuterFont = computed(() => `${props.modelValue.outerHeight / 2}px`);
</script>
<style lang="css" scoped>
.tib-box {
  position: relative;
  width: v-bind(props["modelValue"]["size"]);
  height: v-bind(props["modelValue"]["height"]);
  cursor: pointer;
}

.tib-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: v-bind(props["modelValue"]["size"]);
  height: v-bind(props["modelValue"]["size"]);
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
  width: v-bind(props["modelValue"]["size"]);
  height: v-bind(props["modelValue"]["size"]);
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
  width: v-bind(props["modelValue"]["size"]);
  height: v-bind(props["modelValue"]["size"]);
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
  padding: 5px;
  width: v-bind(props["modelValue"]["ltSize"]);
  height: v-bind(props["modelValue"]["ltSize"]);
  display: flex;
  justify-content: center;
  align-items: center;
}

.tib-lt img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.tib-inner {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: v-bind(getInnerHeight);
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgb(20 20 20 / 50%);
  border-bottom-left-radius: 5px;
  border-bottom-right-radius: 5px;
  color: #fff;
  font-size: v-bind(getInnerFont);
  text-shadow: 0 0 5px #000;
  font-family: Genshin, serif;
}

.tib-inner img {
  width: v-bind(getInnerHeight);
  height: v-bind(getInnerHeight);
  margin-right: 5px;
}

.tib-outer {
  position: absolute;
  bottom: 0;
  border-bottom-left-radius: 5px;
  border-bottom-right-radius: 5px;
  width: 100%;
  height: v-bind(getOuterHeight);
  background: rgb(0 0 0/ 20%);
  display: flex;
  justify-content: center;
  align-items: center;
  font-family: Genshin, serif;
  color: #fff;
  font-size: v-bind(getOuterFont);
  text-shadow: 0 0 5px #000;
}
</style>
