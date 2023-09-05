<template>
  <div class="tuc-dr-box">
    <div class="tuc-dr-bg">
      <img :src="`/icon/relic/${props.pos}.webp`" alt="relic" />
    </div>
    <div v-if="props.modelValue" class="tuc-dr-bg">
      <img :src="`/icon/bg/${props.modelValue.star}-Star.webp`" alt="bg" />
    </div>
    <div v-if="props.modelValue" class="tuc-dr-icon">
      <img :src="props.modelValue.icon" alt="relic" />
    </div>
  </div>
</template>
<script lang="ts" setup>
interface TucDetailRelicProps {
  modelValue: TGApp.Sqlite.Character.RoleReliquary | false;
  pos: number;
}

const props = defineProps<TucDetailRelicProps>();
</script>
<style lang="css" scoped>
.tuc-dr-box {
  position: relative;
  width: 60px;
  height: 60px;
  border-radius: 5px;
  background: rgb(50 56 68/50%);
}

.tuc-dr-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.tuc-dr-bg:nth-child(1) {
  padding: 5px;
}

.tuc-dr-bg img {
  width: 100%;
  height: 100%;
  border-radius: 5px;
}

.tuc-dr-icon {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.tuc-dr-icon img {
  width: 100%;
  height: 100%;
  border-radius: 5px;
}
</style>
