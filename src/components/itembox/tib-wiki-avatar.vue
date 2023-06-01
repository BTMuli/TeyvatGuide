<template>
  <TItemBox :data="props.modelValue as Record<string,string|number>" :size="props.size" model-value="wiki-avatar" display="inner" />
</template>
<script lang="ts" setup>
import TItemBox from "../main/t-itembox.vue";

interface TibCalendarAvatarProps {
  size: string,
  modelValue: TGApp.App.Character.WikiBriefInfo
}

const props = defineProps<TibCalendarAvatarProps>();
</script>
