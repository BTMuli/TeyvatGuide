<template>
  <div class="twoc-container">
    <div class="twoc-marker">
      <v-icon size="18">mdi-all-inclusive</v-icon>
      <span>转换配方</span>
    </div>
    <div class="twoc-recipe">
      <template v-for="(item, index) in props.data.source" :key="item.id">
        <span v-if="index > 0" class="twoc-separator">+</span>
        <div :class="`star${item.star}`" :title="item.name" class="twoc-box">
          <div class="twoc-left">
            <img :src="`/icon/bg/${item.star}-Star.webp`" alt="" class="bg" />
            <img :alt="item.name" :src="`/icon/material/${item.id}.webp`" class="icon" />
          </div>
          <div class="twoc-right">
            <span class="twoc-title">{{ item.name }}</span>
            <span class="twoc-count">×{{ item.count }}</span>
          </div>
          <div class="twoc-extra">{{ item.type }}·{{ item.id }}</div>
        </div>
      </template>
    </div>
  </div>
</template>
<script lang="ts" setup>
type TwoConvertProps = { data: TGApp.App.Material.Convert };

const props = defineProps<TwoConvertProps>();
</script>
<style lang="scss" scoped>
.twoc-container {
  display: flex;
  width: 100%;
  min-width: 0;
  align-items: center;
  padding: 8px;
  border-radius: 4px;
  background: var(--box-bg-3);
  gap: 12px;
}

.twoc-marker {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  color: var(--box-text-4);
  column-gap: 4px;
  font-size: 12px;
  line-height: 16px;
}

.twoc-recipe {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.twoc-separator {
  color: var(--box-text-4);
  font-size: 16px;
}

.twoc-box {
  position: relative;
  display: flex;
  overflow: hidden;
  min-width: 200px;
  height: 48px;
  align-items: center;
  justify-content: flex-start;
  padding-right: 4px;
  border: 1px solid transparent;
  border-radius: 4px;
  column-gap: 4px;
}

.twoc-left {
  position: relative;
  height: 100%;
  flex-shrink: 0;
  aspect-ratio: 1;

  .bg,
  .icon {
    position: absolute;
    top: 0;
    width: 100%;
    height: 100%;
  }
}

.twoc-right {
  position: relative;
  display: flex;
  overflow: hidden;
  max-width: 100%;
  align-items: flex-end;
  justify-content: center;
  color: var(--box-text-2);
  column-gap: 8px;
  text-overflow: ellipsis;
  white-space: nowrap;
  word-break: break-all;
}

.twoc-title {
  overflow: hidden;
  font-size: 14px;
  text-overflow: ellipsis;
}

.twoc-count {
  flex-shrink: 0;
  color: var(--tgc-od-red);
  font-family: var(--font-title);
  font-size: 12px;
  font-weight: normal;
}

.twoc-extra {
  position: absolute;
  z-index: 1;
  right: 2px;
  bottom: 0;
  color: var(--twoc-extra-color);
  font-size: 8px;
  font-style: italic;
  opacity: 0.8;
}

.star1 {
  --twoc-extra-color: var(--tgc-od-white);

  border-color: #abb2bf33;
  background: #abb2bf26;
}

.star2 {
  --twoc-extra-color: var(--tgc-od-green);

  border-color: #98c37933;
  background: #98c37926;
}

.star3 {
  --twoc-extra-color: var(--tgc-od-blue);

  border-color: #61afef33;
  background: #61afef26;
}

.star4 {
  --twoc-extra-color: var(--tgc-od-purple);

  border-color: #c678dd33;
  background: #c678dd26;
}

.star5 {
  --twoc-extra-color: var(--tgc-od-orange);

  border-color: #d19a6633;
  background: #d19a6626;
}
</style>
