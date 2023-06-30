<template>
  {{ props.modelValue }}
</template>
<script lang="ts" setup>
interface HtaTabHoldProps {
  modelValue: TGApp.Plugins.Hutao.Abyss.AvatarHold[];
  data: TGApp.Sqlite.Character.AppData[];
}

const props = defineProps<HtaTabHoldProps>();
</script>
