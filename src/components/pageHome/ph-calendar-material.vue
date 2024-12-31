<template>
  <div class="tcm-box">
    <div class="tcm-left">
      <div class="tcm-bg"><img :src="`/icon/bg/${item.star}-Star.webp`" alt="bg" /></div>
      <div class="tcm-icon"><img :src="`/icon/material/${item.id}.webp`" alt="icon" /></div>
      <div class="tcm-star" v-if="item.star !== 0">
        <img :src="`/icon/star/${item.star}.webp`" alt="element" />
      </div>
    </div>
    <div class="tcm-right">{{ item.name }}</div>
  </div>
</template>
<script lang="ts" setup>
defineProps<{ item: TGApp.App.Calendar.Material }>();
</script>
<style lang="css" scoped>
.tcm-box {
  position: relative;
  display: flex;
  height: 45px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 5px;
  background: var(--box-bg-1);
  gap: 10px;
}

.tcm-left {
  width: 45px;
  height: 45px;
  border-bottom-left-radius: 5px;
  border-top-left-radius: 5px;
}

.tcm-bg,
.tcm-icon {
  position: absolute;
  top: 0;
  width: 45px;
  height: 45px;
  border-bottom-left-radius: 5px;
  border-top-left-radius: 5px;
}

.tcm-bg img,
.tcm-icon img {
  width: 100%;
  height: 100%;
  border-bottom-left-radius: 5px;
  border-top-left-radius: 5px;
  object-fit: cover;
}

.tcm-star {
  position: absolute;
  bottom: -8px;
  width: 45px;
  height: auto;
}

.tcm-star img {
  width: 100%;
}

.tcm-right {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--box-text-2);
  font-size: 14px;
}
</style>
