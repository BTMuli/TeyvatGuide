<template>
  <div class="tuct-box">
    <div class="tuct-title">
      <slot name="title">{{ title }}</slot>
    </div>
    <div class="tuct-text" v-if="!Array.isArray(val)">
      <slot name="text">{{ val }}</slot>
    </div>
    <div class="tuct-icons" v-else>
      <img v-for="(v, idx) in val" :key="idx" :src="`/icon/star/combat${v}.webp`" :alt="`${v}`" />
    </div>
  </div>
</template>
<script lang="ts" setup>
defineProps<{ title: string; val: string | number | Array<number> }>();
</script>
<style lang="css" scoped>
.tuct-box {
  display: flex;
  width: 100%;
  height: auto;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 10px;
  border-radius: 5px;
  background: var(--box-bg-1);
}

.tuct-title {
  color: var(--box-text-4);
  font-family: var(--font-title);
  font-size: 20px;
}

.tuct-text {
  color: var(--tgc-yellow-1);
  font-family: var(--font-text);
  font-size: 20px;
}

.tuct-icons {
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    height: 30px;
    aspect-ratio: 1;
  }
}
</style>
