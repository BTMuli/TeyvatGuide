<template>
  <TItemBox :data="props.modelValue as Record<string,string|number>" :size="props.size" model-value="wiki-weapon" display="inner" />
</template>
<script lang="ts" setup>
import TItemBox from "../main/t-itembox.vue";

interface TibCalendarWeaponProps {
  size: string,
  modelValue: TGApp.App.Weapon.WikiBriefInfo
}

const props = defineProps<TibCalendarWeaponProps>();
</script>
