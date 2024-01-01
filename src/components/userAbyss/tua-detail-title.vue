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
  height: 30px;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--common-shadow-4);
}

.tud-t-title {
  color: var(--box-text-4);
}

.tud-t-val {
  display: flex;
  align-items: center;
  color: var(--tgc-yellow-1);
  font-family: var(--font-title);
  gap: 5px;
}

.tud-t-val img {
  width: 20px;
  height: 20px;
  padding: 1px;
  filter: invert(22%) sepia(7%) saturate(1241%) hue-rotate(182deg) brightness(95%) contrast(99%);
  object-fit: cover;
}

.dark .tud-t-val img {
  filter: none;
}
</style>
