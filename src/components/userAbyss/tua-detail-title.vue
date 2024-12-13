<template>
  <div class="tud-t-box">
    <div class="tud-t-title">
      <slot name="title">{{ props.name }}</slot>
    </div>
    <div class="tud-t-val">
      <img src="/icon/star/Abyss.webp" alt="Abyss" />
      <slot name="val">{{ props.val }}</slot>
    </div>
  </div>
</template>
<script lang="ts" setup>
type TuaDetailTitleProps = { name: string; val: number; mode: "floor" | "level" };

const props = defineProps<TuaDetailTitleProps>();
</script>
<style lang="css" scoped>
.tud-t-box {
  display: flex;
  height: 30px;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--common-shadow-4);
  font-family: v-bind("props.mode === 'level' ? 'var(--font-text)' : 'var(--font-title)'");
}

.tud-t-title {
  color: var(--box-text-4);
  font-size: v-bind("props.mode === 'level' ? '18px' : '20px'");
}

.tud-t-val {
  display: flex;
  align-items: center;
  color: var(--tgc-yellow-1);
  font-family: var(--font-title);
  font-size: v-bind("props.mode === 'level' ? '18px' : '20px'");
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
