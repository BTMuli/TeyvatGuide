<template>
  <div class="tib-box">
    <div class="tib-bg">
      <slot name="bg"><img :src="props.modelValue.bg" alt="bg" /></slot>
    </div>
    <div class="tib-icon">
      <slot name="icon"><img :src="props.modelValue.icon" alt="icon" /></slot>
    </div>
    <div class="tib-cover">
      <div v-show="props.modelValue.lt !== ''" class="tib-lt">
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
<style lang="scss" scoped>
.tib-box {
  position: relative;
  width: v-bind("props.modelValue.size");
  height: v-bind("props.modelValue.height");
  cursor: v-bind('props.modelValue.clickable ? "pointer" : "default"');
}

.tib-bg {
  position: absolute;
  z-index: 0;
  top: 0;
  left: 0;
  overflow: hidden;
  width: v-bind("props.modelValue.size");
  height: v-bind("props.modelValue.size");
  border-radius: 4px;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.tib-icon {
  position: relative;
  z-index: 1;
  overflow: hidden;
  width: v-bind("props.modelValue.size");
  height: v-bind("props.modelValue.size");
  border-radius: 4px;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.tib-cover {
  position: absolute;
  z-index: 2;
  top: 0;
  left: 0;
  display: flex;
  overflow: hidden;
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

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
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
  background: #00000066;
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
  overflow: hidden;
  width: 100%;
  height: v-bind("`${props.modelValue.innerHeight ?? 0}px`");
  flex-grow: 1;
  flex-shrink: 0;
  align-items: stretch;
  justify-content: center;
  border-radius: 0 0 4px 4px;
  -webkit-backdrop-filter: blur(v-bind("props.modelValue.innerBlur ?? 0"));
  backdrop-filter: blur(v-bind("props.modelValue.innerBlur ?? 0"));
  background: #14141480;
  color: var(--tgc-white-1);
  font-family: var(--font-title);
  font-size: v-bind("`${(props.modelValue.innerHeight ?? 0)/2}px`");
  line-height: v-bind(
    "props.modelValue.innerHeight ? `${props.modelValue.innerHeight}px` : 'auto'"
  );

  img {
    position: relative;
    box-sizing: border-box;
    flex-shrink: 0;
    padding: 1%;
    aspect-ratio: 1;
  }

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    word-break: break-all;
  }
}

.tib-outer {
  position: relative;
  display: flex;
  width: 100%;
  height: v-bind("`${props.modelValue.outerHeight ?? 0}px`");
  align-items: center;
  justify-content: center;
  color: var(--common-text-title);
  font-size: v-bind("`${(props.modelValue.outerHeight ?? 0)/2}px`");
  line-height: v-bind("`${(props.modelValue.outerHeight ?? 0)}px`");
  text-align: center;
}
</style>
