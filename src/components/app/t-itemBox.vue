<template>
  <div class="tib-box">
    <div class="tib-bg">
      <slot name="bg"><img :src="props.modelValue.bg" alt="bg" /></slot>
    </div>
    <div class="tib-icon">
      <slot name="icon"><img :src="props.modelValue.icon" alt="icon" /></slot>
    </div>
    <div class="tib-cover">
      <div class="tib-lt" v-show="props.modelValue.lt !== ''">
        <img :src="props.modelValue.lt" alt="lt" />
      </div>
      <div v-show="props.modelValue.rt" class="tib-rt">{{ props.modelValue.rt }}</div>
      <div class="tib-inner">
        <slot name="inner-icon">
          <img
            v-show="props.modelValue.innerIcon"
            :src="props.modelValue.innerIcon"
            alt="inner-icon"
          />
        </slot>
        <slot name="inner-text">
          <span :title="props.modelValue.innerText">{{ props.modelValue.innerText }}</span>
        </slot>
      </div>
    </div>
    <div v-if="props.modelValue.display === 'outer'" class="tib-outer">
      <slot name="outer-text">
        <span :title="props.modelValue.innerText">{{ props.modelValue.outerText }}</span>
      </slot>
    </div>
  </div>
</template>
<script lang="ts" setup>
export type TItemBoxData = {
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
  innerBlur?: string;
};
type TItemBoxProps = { modelValue: TItemBoxData };

const props = defineProps<TItemBoxProps>();
</script>
<style lang="css" scoped>
.tib-box {
  position: relative;
  width: v-bind("props.modelValue.size");
  height: v-bind("props.modelValue.height");
  cursor: v-bind('props.modelValue.clickable ? "pointer" : "default"');
}

.tib-bg {
  position: absolute;
  top: 0;
  left: 0;
  overflow: hidden;
  width: v-bind("props.modelValue.size");
  height: v-bind("props.modelValue.size");
  border-radius: 4px;
}

.tib-bg img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.tib-icon {
  position: relative;
  overflow: hidden;
  width: v-bind("props.modelValue.size");
  height: v-bind("props.modelValue.size");
  border-radius: 4px;
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
  width: v-bind("props.modelValue.size");
  height: v-bind("props.modelValue.size");
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.tib-lt {
  position: absolute;
  top: 3%;
  left: 3%;
  display: flex;
  width: v-bind("props.modelValue.ltSize");
  height: v-bind("props.modelValue.ltSize");
  align-items: center;
  justify-content: center;
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
  width: v-bind("props.modelValue.rtSize");
  height: v-bind("props.modelValue.rtSize");
  align-items: center;
  justify-content: center;
  background: rgb(0 0 0 / 40%);
  border-bottom-left-radius: 4px;
  border-top-right-radius: 4px;
  color: var(--tgc-white-1);
  font-family: var(--font-title);
}

.tib-inner {
  position: absolute;
  bottom: 0;
  left: 0;
  display: flex;
  width: 100%;
  height: v-bind("props.modelValue.innerHeight ?? 0") px;
  flex-grow: 1;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  -webkit-backdrop-filter: blur(v-bind("props.modelValue.innerBlur ?? 0"));
  backdrop-filter: blur(v-bind("props.modelValue.innerBlur ?? 0"));
  background: rgb(20 20 20 / 40%);
  border-bottom-left-radius: 4px;
  border-bottom-right-radius: 4px;
  color: var(--tgc-white-1);
  font-family: var(--font-title);
  font-size: v-bind("((props.modelValue.innerHeight ?? 0) / 2).toString() + 'px'");
}

.tib-inner img {
  width: v-bind("(props.modelValue.innerHeight ?? 0).toString() + 'px'");
  height: v-bind("(props.modelValue.innerHeight ?? 0).toString() + 'px'");
  padding: 1px;
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
  height: v-bind("(props.modelValue.outerHeight ?? 0).toString() + 'px'");
  align-items: center;
  justify-content: center;
  color: var(--common-text-title);
  font-size: v-bind("((props.modelValue.outerHeight ?? 0)/2).toString() + 'px'");
  text-align: center;
}
</style>
