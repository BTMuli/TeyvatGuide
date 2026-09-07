<template>
  <div class="tua-dct-box">
    <TuaDcTalentItem v-for="skill in props.modelValue" :key="skill.skill_id" :skill />
  </div>
</template>
<script lang="ts" setup>
import TuaDcTalentItem from "@comp/userAvatar/tua-dc-talent-item.vue";

type TuaDcTalentsProps = { modelValue: Array<TGApp.Game.Avatar.Skill> };

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
</style>
