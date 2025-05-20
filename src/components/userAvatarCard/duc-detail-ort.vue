<template>
  <div class="duc-dort-box">
    <div
      :title="talent.name"
      v-for="talent in props.modelValue"
      :key="talent.skill_id"
      class="duc-dort-item"
    >
      <span>{{ talent.name }}</span>
      <div class="duc-dort-icon">
        <TMiImg :ori="true" :src="talent.icon" alt="talent" />
      </div>
      <span>Lv.{{ talent.level === 0 ? 1 : talent.level }}</span>
    </div>
  </div>
</template>
<script lang="ts" setup>
import TMiImg from "@comp/app/t-mi-img.vue";

type DucDetailOrtProps = { modelValue: Array<TGApp.Game.Avatar.Skill> };

const props = defineProps<DucDetailOrtProps>();
</script>
<style lang="css" scoped>
.duc-dort-box {
  display: flex;
  flex-direction: column;
  row-gap: 10px;
}

.duc-dort-item {
  display: flex;
  justify-content: flex-end;
  column-gap: 8px;
}

.duc-dort-icon {
  position: relative;
  display: flex;
  width: 48px;
  height: 48px;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: 50%;
  -webkit-backdrop-filter: blur(5px);
  backdrop-filter: blur(5px);
  background: rgb(0 0 0 / 40%);

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
}

.duc-dort-item span {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--tgc-white-1);
  font-family: var(--font-title);
  font-size: 16px;
  text-shadow: 0 0 5px rgb(0 0 0 / 40%);
}
</style>
