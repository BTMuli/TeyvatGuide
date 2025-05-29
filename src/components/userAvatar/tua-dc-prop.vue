<template>
  <div class="tua-dcp-box">
    <div class="tua-prop-left">
      <img :src="props.prop.icon" alt="icon" v-if="props.prop.icon !== ''" />
      <span>{{ props.prop.name }}</span>
    </div>
    <div class="tua-prop-right" :title="getRightTitle()">
      {{ props.modelValue.final }}
    </div>
  </div>
</template>
<script lang="ts" setup>
import { computed } from "vue";

type TuaDcPropProps = { modelValue: TGApp.Game.Avatar.Prop; prop: TGApp.Game.Avatar.PropMapItem };

const props = defineProps<TuaDcPropProps>();
const getWidth = computed<string>(() => {
  if (props.prop.icon === "") return "110px";
  if (props.prop.name.length > 5) return "150px";
  return "130px";
});

function getRightTitle(): string {
  if (props.modelValue.add === "") return props.modelValue.final;
  return `${props.modelValue.base} + ${props.modelValue.add}`;
}
</script>
<style lang="css" scoped>
.tua-dcp-box {
  position: relative;
  display: flex;
  width: v-bind(getWidth); /* stylelint-disable-line value-keyword-case */
  height: 20px;
  align-items: center;
  justify-content: space-between;
  color: var(--tgc-white-1);
  font-size: 12px;
}

.tua-prop-left {
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    width: 14px;
    height: 14px;
    object-fit: contain;
  }
}

.tua-prop-right {
  padding-right: 16px;
}
</style>
