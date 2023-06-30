<template>
  {{ props.modelValue }}
</template>
<script lang="ts" setup>
interface HtaTabUseProps {
  modelValue: TGApp.Plugins.Hutao.Abyss.AvatarUse[];
  data: TGApp.Sqlite.Character.AppData[];
}

const props = defineProps<HtaTabUseProps>();
</script>
