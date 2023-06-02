<template>
  <div class="tud-t-box">
    <div class="tud-t-title">
      <slot name="title">
        <span>{{ props.name }}</span>
      </slot>
    </div>
    <div class="tud-t-val">
      <img src="/icon/star/Abyss.webp" alt="Abyss">
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

const props = withDefaults(defineProps<TuaDetailTitleProps>(), {
  mode: "level",
});

const getFont: ComputedRef<string> = computed(() => {
  return props.mode === "level" ? "Genshin-Light, serif" : "Genshin, serif";
});
</script>
<style lang="css" scoped>
.tud-t-box {
  height: 30px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-family: v-bind(getFont);
}

.tud-t-title {
  font-size: 20px;
  color: rgb(255 255 255 / 80%);
  text-shadow: 0 0 10px rgb(0 0 0 / 80%);
}

.tud-t-val {
  display: flex;
  align-items: center;
  font-family: Genshin-Light, serif;
  font-size: 20px;
  color: rgb(255 255 255 / 80%);
  text-shadow: #fec90b 0 0 5px;
}

.tud-t-val img {
  width: 20px;
  height: 20px;
  object-fit: cover;
  margin-right: 5px;
}
</style>
