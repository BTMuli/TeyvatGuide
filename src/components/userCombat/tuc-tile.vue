<!-- 真境剧诗概况卡片 -->
<template>
  <div class="tuct-box">
    <div class="tuct-title">
      <slot name="title">{{ props.title }}</slot>
    </div>
    <div v-if="!Array.isArray(props.val)" class="tuct-text">
      <slot name="text">{{ props.val }}</slot>
    </div>
    <div v-else class="tuct-icons">
      <template v-for="(v, idx) in props.val" :key="idx">
        <img
          v-if="idx < 10"
          :alt="`${v}`"
          :class="`stat${v}`"
          :src="`/icon/combat/star_${v}.webp`"
          :title="`第${idx + 1}幕`"
        />
        <img
          v-else
          :alt="`${v}`"
          :class="`stat${v}`"
          :src="`/icon/combat/tarot_${v}.webp`"
          :title="`圣牌${idx - 9}`"
        />
      </template>
    </div>
  </div>
</template>
<script lang="ts" setup>
type TucTileProps = { title: string; val: string | number | Array<number> };

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
  padding: 8px;
  border-radius: 4px;
  background: var(--box-bg-1);
  font-family: var(--font-title);
}

.tuct-title {
  color: var(--box-text-4);
  font-size: 20px;
}

.tuct-text {
  color: var(--box-text-8);
  font-size: 20px;
}

.tuct-icons {
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    height: 30px;
    object-fit: contain;

    &.stat0 {
      filter: invert(0.4);
    }
  }
}

.dark .tuct-icons img.stat0 {
  filter: unset;
}
</style>
