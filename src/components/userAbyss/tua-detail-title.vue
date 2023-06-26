<template>
  <div class="tud-t-box">
    <div class="tud-t-title">
      <slot name="title">
        <span>{{ props.name }}</span>
      </slot>
    </div>
    <div class="tud-t-val">
      <img src="/icon/star/Abyss.webp" alt="Abyss" />
      <slot name="val">
        <span>{{ props.val }}</span>
      </slot>
    </div>
  </div>
</template>
<script lang="ts" setup>
// vue
import { computed, ComputedRef } from "vue";

interface TuaDetailTitleProps {
  name: string;
  val: number;
  mode: "floor" | "level";
}

const props = defineProps<TuaDetailTitleProps>();

const getFont: ComputedRef<string> = computed(() => {
  return props.mode === "level" ? "var(--font-text)" : "var(--font-title)";
});
const getFontSize: ComputedRef<string> = computed(() => {
  return props.mode === "level" ? "18px" : "20px";
});
</script>
<style lang="css" scoped>
.tud-t-box {
  display: flex;
  width: 100%;
  height: 30px;
  align-items: center;
  justify-content: space-between;
  font-family: v-bind(getFont);
}

.tud-t-title {
  color: var(--common-text-content);
  font-size: v-bind(getFontSize);
}

.tud-t-val {
  display: flex;
  align-items: center;
  color: var(--common-color-white);
  font-family: var(--font-text);
  font-size: v-bind(getFontSize);
  text-shadow: 0 0 10px var(--common-color-yellow);
}

.dark .tud-t-val {
  color: var(--common-color-yellow);
  text-shadow: none;
}

.tud-t-val img {
  width: 20px;
  height: 20px;
  margin-right: 5px;
  object-fit: cover;
}
</style>
