<template>
  <div class="tuct-box">
    <div class="tuct-title">
      <slot name="title">{{ props.title }}</slot>
    </div>
    <div class="tuct-text" v-if="!Array.isArray(props.val)">
      <slot name="text">{{ props.val }}</slot>
    </div>
    <div class="tuct-icons" v-else>
      <img
        v-for="(val, idx) in props.val"
        :key="idx"
        :src="`/icon/star/combat${val}.webp`"
        :alt="`${val}`"
      />
    </div>
  </div>
</template>
<script lang="ts" setup>
interface TucTileProps {
  title: string;
  val: string | number | number[];
}

const props = defineProps<TucTileProps>();
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
