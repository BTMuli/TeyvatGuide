<template>
  <div class="tib2-box">
    <div class="tib2-left">
      <slot name="left">
        <div v-if="props.modelValue.bg !== undefined" class="tib2-bg">
          <img :src="props.modelValue.bg" alt="bg" />
        </div>
        <div class="tib2-icon">
          <img :src="props.modelValue.icon" alt="icon" />
        </div>
        <div v-if="props.modelValue.star !== undefined" class="tib2-star">
          <img :src="props.modelValue.star" alt="element" />
        </div>
      </slot>
    </div>
    <div class="tib2-right">
      {{ props.modelValue.name }}
    </div>
  </div>
</template>
<script lang="ts" setup>
export interface TItemBox2Data {
  width: string;
  height: string;
  bg?: string;
  icon: string;
  star?: string;
  name: string;
}

interface TItemBox2Props {
  modelValue: TItemBox2Data;
}

const props = defineProps<TItemBox2Props>();
</script>
<style lang="css" scoped>
.tib2-box {
  position: relative;
  height: v-bind(props[ "modelValue"][ "height"]);
  width: v-bind(props[ "modelValue"][ "width"]);
  display: flex;
  border-radius: 5px;
  background: rgb(20 20 20 / 30%);
}

.tib2-left {
  width: v-bind(props[ "modelValue"][ "height"]);
  height: v-bind(props[ "modelValue"][ "height"]);
  border-top-left-radius: 5px;
  border-bottom-left-radius: 5px;
  overflow: hidden;
}

.tib2-bg,
.tib2-icon {
  position: absolute;
  top: 0;
  width: v-bind(props[ "modelValue"][ "height"]);
  height: v-bind(props[ "modelValue"][ "height"]);
  border-top-left-radius: 5px;
  border-bottom-left-radius: 5px;
  overflow: hidden;
}

.tib2-bg img,
.tib2-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.tib2-star {
  position: absolute;
  bottom: -5px;
  width: v-bind(props[ "modelValue"][ "height"]);
  height: auto;
}

.tib2-star img {
  width: 100%;
}

.tib2-right {
  margin-left: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: calc(0.2 * v-bind(props[ "modelValue"][ "height"]));
  color: var(--common-color-white);
  overflow: hidden;
}
</style>
