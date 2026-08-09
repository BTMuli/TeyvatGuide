<template>
  <div class="twoc-container">
    <div class="twoc-marker">
      <v-icon size="18">mdi-all-inclusive</v-icon>
      <span>转换配方</span>
    </div>
    <div class="twoc-recipe">
      <template v-for="(item, index) in props.data.source" :key="item.id">
        <span v-if="index > 0" class="twoc-separator">+</span>
        <div class="twoc-box">
          <div class="twoc-left">
            <img :src="`/icon/bg/${item.star}-BGC.webp`" alt="" class="bg" />
            <img :alt="item.name" :src="`/icon/material/${item.id}.webp`" class="icon" />
          </div>
          <div class="twoc-right">
            <span>{{ item.name }}</span>
            <span>×{{ item.count }}</span>
          </div>
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
  display: flex;
  overflow: hidden;
  min-width: 140px;
  align-items: center;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--app-page-bg);
}

.twoc-left {
  position: relative;
  display: flex;
  overflow: hidden;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;

  .bg {
    position: absolute;
    z-index: 1;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }

  .icon {
    position: relative;
    z-index: 2;
    width: 36px;
    height: 36px;
    object-fit: contain;
  }
}

.twoc-right {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px;
  color: var(--box-text-2);
  font-size: 12px;
  gap: 8px;
  line-height: 16px;

  span:first-child {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  span:last-child {
    flex-shrink: 0;
    color: var(--box-text-4);
  }
}
</style>
