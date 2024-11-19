<template>
  <div class="twoc-container">
    <v-icon>mdi-all-inclusive</v-icon>
    <div class="twoc-box" v-for="(item, index) in props.data.source" :key="index">
      <img
        class="twoc-left"
        :src="`/icon/material/${item.id}.webp`"
        alt="icon"
        :style="{
          'background-image': `url('/icon/bg/${item.star}-BGC.webp')`,
        }"
      />
      <div class="twoc-right">
        <span>{{ item.name }}</span>
        <span>{{ item.count }}</span>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
interface TwoConvertProps {
  data: TGApp.App.Material.Convert;
}

const props = defineProps<TwoConvertProps>();
</script>
<style lang="css" scoped>
.twoc-container {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: flex-start;
  border-radius: 5px;
  column-gap: 10px;
}

.twoc-box {
  display: flex;
  border-radius: 5px;
  background: var(--box-bg-3);
  color: var(--box-text-4);
  column-gap: 5px;
}

.twoc-left {
  display: flex;
  width: 45px;
  height: 45px;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
}

.twoc-right {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding-right: 10px;
  column-gap: 15px;
}
</style>
