<template>
  {{ props.modelValue }}
</template>
<script lang="ts" setup>
interface HtaTabTeamProps {
  modelValue: TGApp.Plugins.Hutao.Abyss.TeamCombination[];
  data: TGApp.Sqlite.Character.AppData[];
}

const props = defineProps<HtaTabTeamProps>();
</script>
