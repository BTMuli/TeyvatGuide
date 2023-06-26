<template>
  <div class="tuc-dc-box">
    <div v-if="!modelValue.active" class="tuc-dc-lock">
      <v-icon color="white"> mdi-lock </v-icon>
    </div>
    <div class="tuc-dc-icon">
      <img :src="modelValue.icon" alt="constellation" />
    </div>
  </div>
</template>
<script lang="ts" setup>
interface TucDetailConstellationProps {
  modelValue: TGApp.Sqlite.Character.RoleConstellation;
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
  cursor: pointer;
}

.tuc-dc-lock {
  position: absolute;
  display: flex;
  width: 50px;
  height: 50px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: rgb(0 0 0 / 50%);
}

.tuc-dc-icon {
  width: 50px;
  height: 50px;
  padding: 5px;
  border-radius: 50%;
  background: rgb(0 0 0/ 20%);
}

.tuc-dc-icon img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
}
</style>
