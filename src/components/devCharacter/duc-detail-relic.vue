<template>
  <div class="duc-dr-box">
    <div class="duc-dr-bg">
      <img :src="`/icon/relic/${props.pos}.webp`" alt="relic" />
    </div>
    <div v-if="props.modelValue" class="duc-dr-bg">
      <img :src="`/icon/bg/${props.modelValue.star}-Star.webp`" alt="bg" />
    </div>
    <div v-if="props.modelValue" class="duc-dr-icon">
      <img :src="props.modelValue.icon" alt="relic" />
    </div>
    <div v-if="props.modelValue !== false" class="duc-dr-level">
      {{ props.modelValue.level }}
    </div>
  </div>
</template>
<script lang="ts" setup>
interface ducDetailRelicProps {
  modelValue: TGApp.Sqlite.Character.RoleReliquary | false;
  pos: number;
}

const props = defineProps<ducDetailRelicProps>();
</script>
<style lang="css" scoped>
.duc-dr-box {
  position: relative;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: rgb(50 56 68/50%);
}

.duc-dr-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.duc-dr-bg:nth-child(1) {
  padding: 5px;
}

.duc-dr-bg img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
}

.duc-dr-icon {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.duc-dr-icon img {
  width: 100%;
  height: 100%;
  border-radius: 5px;
}

.duc-dr-level {
  position: absolute;
  right: -4px;
  bottom: -4px;
  display: flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--tgc-yellow-3);
  color: var(--tgc-white-1);
  font-family: var(--font-title);
  font-size: 12px;
  line-height: 1;
}
</style>
