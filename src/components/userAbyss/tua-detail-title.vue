<template>
  <div
    class="tud-t-box"
    :style="{
      fontFamily: props.mode === 'level' ? 'var(--font-text)' : 'var(--font-title)',
    }"
  >
    <div
      class="tud-t-title"
      :style="{
        fontSize: props.mode === 'level' ? '18px' : '20px',
      }"
    >
      <slot name="title">
        <span>{{ props.name }}</span>
      </slot>
    </div>
    <div
      class="tud-t-val"
      :style="{
        fontSize: props.mode === 'level' ? '18px' : '20px',
      }"
    >
      <img src="/icon/star/Abyss.webp" alt="Abyss" />
      <slot name="val">
        <span>{{ props.val }}</span>
      </slot>
    </div>
  </div>
</template>
<script lang="ts" setup>
interface TuaDetailTitleProps {
  name: string;
  val: number;
  mode: "floor" | "level";
}

const props = defineProps<TuaDetailTitleProps>();
</script>
<style lang="css" scoped>
.tud-t-box {
  display: flex;
  width: 100%;
  height: 30px;
  align-items: center;
  justify-content: space-between;
}

.tud-t-title {
  color: var(--common-text-content);
}

.tud-t-val {
  display: flex;
  align-items: center;
  color: var(--common-color-white);
  font-family: var(--font-text);
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
