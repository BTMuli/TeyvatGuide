<!-- 真境剧诗概况卡片组件 -->
<template>
  <div class="tuct-box">
    <div class="tuct-title">
      <slot name="title">{{ props.title }}</slot>
    </div>
    <div class="tuct-text" v-if="!Array.isArray(props.val)">
      <slot name="text">{{ props.val }}</slot>
    </div>
    <div class="tuct-icons" v-else>
      <template v-for="(v, idx) in props.val" :key="idx">
        <img
          v-if="idx < 10"
          :src="`/icon/combat/star_${v}.webp`"
          :alt="`${v}`"
          :title="`第${idx + 1}幕`"
        />
        <img v-else :src="`/icon/combat/tarot_${v}.webp`" :alt="`${v}`" :title="`圣牌${idx - 9}`" />
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
  font-weight: bold;
}

.tuct-icons {
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    height: 30px;
    object-fit: contain;
  }
}
</style>
