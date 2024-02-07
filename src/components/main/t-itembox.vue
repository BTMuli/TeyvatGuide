<template>
  <div
    class="tib-box"
    :style="{
      width: modelValue.size,
      height: modelValue.height,
      cursor: modelValue.clickable ? 'pointer' : 'default',
    }"
  >
    <div
      class="tib-bg"
      :style="{
        width: modelValue.size,
        height: modelValue.size,
      }"
    >
      <slot name="bg">
        <img :src="modelValue.bg" alt="bg" />
      </slot>
    </div>
    <div
      class="tib-icon"
      :style="{
        width: modelValue.size,
        height: modelValue.size,
      }"
    >
      <slot name="icon">
        <img :src="modelValue.icon" alt="icon" />
      </slot>
    </div>
    <div
      class="tib-cover"
      :style="{
        width: modelValue.size,
        height: modelValue.size,
      }"
    >
      <div
        class="tib-lt"
        :style="{
          width: modelValue.ltSize,
          height: modelValue.ltSize,
        }"
      >
        <img :src="modelValue.lt" alt="lt" />
      </div>
      <div
        v-show="modelValue.rt"
        class="tib-rt"
        :style="{
          width: modelValue.rtSize,
          height: modelValue.rtSize,
        }"
      >
        {{ modelValue.rt }}
      </div>
      <div
        class="tib-inner"
        :style="{
          height: `${props.modelValue.innerHeight ?? 0}px`,
          fontSize: `${props.modelValue.innerHeight ? props.modelValue.innerHeight / 2 : 0}px`,
        }"
      >
        <slot name="inner-icon">
          <img
            v-show="modelValue.innerIcon"
            :src="modelValue.innerIcon"
            alt="inner-icon"
            :style="{
              width: `${props.modelValue.innerHeight ?? 0}px`,
              height: `${props.modelValue.innerHeight ?? 0}px`,
            }"
          />
        </slot>
        <slot name="inner-text">
          <span :title="modelValue.innerText">{{ modelValue.innerText }}</span>
        </slot>
      </div>
    </div>
    <div
      v-if="modelValue.display === 'outer'"
      class="tib-outer"
      :style="{
        height: `${props.modelValue.outerHeight ?? 0}px`,
        fontSize: `${props.modelValue.outerHeight ? props.modelValue.outerHeight / 2 : 0}px`,
      }"
    >
      <slot name="outer-text">
        <span>{{ modelValue.outerText }}</span>
      </slot>
    </div>
  </div>
</template>
<script lang="ts" setup>
export interface TItemBoxData {
  bg: string;
  icon: string;
  size: string;
  height: string;
  display: "inner" | "outer";
  clickable: boolean;
  lt: string;
  ltSize: string;
  rt?: string;
  rtSize?: string;
  innerHeight?: number;
  innerIcon?: string;
  innerText: string;
  outerHeight?: number;
  outerText?: string;
}

interface TItemBoxProps {
  modelValue: TItemBoxData;
}

const props = defineProps<TItemBoxProps>();
</script>
<style lang="css" scoped>
.tib-box {
  position: relative;
}

.tib-bg {
  position: absolute;
  top: 0;
  left: 0;
  overflow: hidden;
  border-radius: 5px;
}

.tib-bg img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.tib-icon {
  position: relative;
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
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
}

.tib-lt {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 5px;
}

.tib-lt img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.tib-rt {
  position: absolute;
  top: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(0 0 0 / 40%);
  border-bottom-left-radius: 5px;
  border-top-right-radius: 5px;
  color: var(--tgc-white-1);
  font-family: var(--font-title);
}

.tib-inner {
  position: absolute;
  bottom: 0;
  left: 0;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  background: rgb(20 20 20 / 40%);
  border-bottom-left-radius: 5px;
  border-bottom-right-radius: 5px;
  color: var(--tgc-white-1);
  font-family: var(--font-title);
}

.tib-inner img {
  margin-right: 5px;
}

.tib-inner span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  word-break: break-all;
}

.tib-outer {
  position: absolute;
  bottom: 0;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  color: var(--common-text-title);
  text-align: center;
}
</style>
