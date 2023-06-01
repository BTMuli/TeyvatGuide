<template>
  <TItemBox :data="props.modelValue as Record<string,string|number>" :size="props.size" model-value="calendar-avatar" display="inner" />
</template>
<script lang="ts" setup>
import TItemBox from "../main/t-itembox.vue";

interface TibCalendarAvatarProps {
  size: string,
  modelValue: TGApp.App.Calendar.Item
}

const props = defineProps<TibCalendarAvatarProps>();
</script>
