<template>
  <div class="tcm-box">
    <div class="tcm-left">
      <div class="tcm-bg"><img :src="props.item.bg" alt="bg" /></div>
      <div class="tcm-icon"><img :src="props.item.icon" alt="icon" /></div>
      <div class="tcm-star" v-if="props.item.star !== 0">
        <img :src="props.item.starIcon" alt="element" />
      </div>
    </div>
    <div class="tcm-right">{{ props.item.name }}</div>
  </div>
</template>
<script lang="ts" setup>
interface TMiniWeaponProps {
  item: TGApp.App.Calendar.Material;
}

const props = defineProps<TMiniWeaponProps>();
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
