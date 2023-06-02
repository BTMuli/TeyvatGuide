<template>
  <TItemBox :data="character as Record<string,string|number>" size="80px" model-value="abyss-overview" display="inner" />
</template>
<script lang="ts" setup>
// vue
import { onMounted, ref } from "vue";
import TItemBox from "../main/t-itembox.vue";
// utils
import TGSqlite from "../../plugins/Sqlite";

interface TibAbyssOverviewProps {
  modelValue: TGApp.Sqlite.Abyss.Character;
}

export interface TibAbyssOverviewAvatar extends TGApp.Sqlite.Character.AppData {
  value: number,
}

const props = defineProps<TibAbyssOverviewProps>();

const character = ref({} as TibAbyssOverviewAvatar);

onMounted(async () => {
  const res = await TGSqlite.getAppCharacter(props.modelValue.id);
  character.value = {
    ...res,
    value: props.modelValue.value,
  } as TibAbyssOverviewAvatar;
});
</script>
