<template>
  <div class="tuc-dc-box">
    <div v-if="!modelValue.is_actived" class="tuc-dc-lock">
      <v-icon color="white"> mdi-lock </v-icon>
    </div>
    <div class="tuc-dc-icon">
      <img :src="modelValue.icon" alt="constellation" />
    </div>
  </div>
</template>
<script lang="ts" setup>
interface TucDetailConstellationProps {
  modelValue: TGApp.Game.Avatar.Constellation;
}

defineProps<TucDetailConstellationProps>();
</script>
<style lang="css" scoped>
.tuc-dc-box {
  display: flex;
  width: 60px;
  height: 60px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.tuc-dc-lock {
  position: absolute;
  display: flex;
  width: 54px;
  height: 54px;
  align-items: center;
  justify-content: center;
  padding: 3px;
  border-radius: 50%;
  background-color: rgb(0 0 0 / 50%);
}

.tuc-dc-icon {
  width: 54px;
  height: 54px;
  padding: 3px;
  border: 1px solid rgb(0 0 0/20%);
  border-radius: 50%;
  background: rgb(50 56 68/50%);
}

.tuc-dc-icon img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
}
</style>
