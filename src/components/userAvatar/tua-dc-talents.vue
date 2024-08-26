<template>
  <div class="tua-dct-box">
    <div
      v-for="skill in props.modelValue"
      :key="skill.skill_id"
      :title="skill.name"
      class="tua-dct-item"
    >
      <img :src="skill.icon" alt="talent" class="tua-dct-icon" />
      <div v-if="!skill.is_unlock" class="tua-dct-lock">
        <v-icon size="10px">mdi-lock</v-icon>
      </div>
      <div class="tua-dct-level" v-if="skill.is_unlock && skill.skill_type === 1">
        {{ skill.level === 0 ? 1 : skill.level }}
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
interface TuaDcTalentsProps {
  modelValue: TGApp.Game.Avatar.Skill[];
}

const props = defineProps<TuaDcTalentsProps>();
</script>
<style lang="css" scoped>
.tua-dct-box {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
}

.tua-dct-item {
  position: relative;
  display: flex;
  width: 35px;
  height: 35px;
  align-items: center;
  justify-content: center;
  padding: 2px;
  border: 1px solid rgb(255 255 255 / 20%);
  border-radius: 50%;
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  background: rgb(0 0 0 / 20%);
}

.tua-dct-icon {
  width: 100%;
  height: 100%;
}

.tua-dct-lock {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  padding: 5px;
  border-radius: 50%;
  background: rgb(0 0 0 / 50%);
}

.tua-dct-lock v-icon {
  color: var(--tgc-white-1);
}

.tua-dct-level {
  position: absolute;
  right: 0;
  bottom: -15px;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  padding-top: 1px;
  border-radius: 4px;
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  background: rgb(0 0 0 / 50%);
  color: var(--tgc-white-1);
  font-size: 8px;
  text-shadow: 0 0 5px rgb(0 0 0 / 50%);
}
</style>
