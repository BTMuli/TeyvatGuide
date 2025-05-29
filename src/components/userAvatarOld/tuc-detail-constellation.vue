<template>
  <div class="tuc-dc-box">
    <div v-if="!modelValue.is_actived" class="tuc-dc-lock">
      <v-icon color="white"> mdi-lock</v-icon>
    </div>
    <div class="tuc-dc-icon">
      <TMiImg :ori="true" :src="modelValue.icon" alt="constellation" />
    </div>
  </div>
</template>
<script lang="ts" setup>
import TMiImg from "@comp/app/t-mi-img.vue";

defineProps<{ modelValue: TGApp.Game.Avatar.Constellation }>();
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
  background-color: #00000080;
}

.tuc-dc-icon {
  display: flex;
  width: 54px;
  height: 54px;
  align-items: center;
  justify-content: center;
  padding: 3px;
  border: 1px solid #00000033;
  border-radius: 50%;
  background: #32384480;
}

.tuc-dc-icon img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
}
</style>
