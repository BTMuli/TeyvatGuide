<template>
  {{ props.modelValue }}
</template>
<script lang="ts" setup>
interface HtaTabUpProps {
  modelValue: TGApp.Plugins.Hutao.Abyss.AvatarUp[];
  data: TGApp.Sqlite.Character.AppData[];
}

const props = defineProps<HtaTabUpProps>();
</script>
