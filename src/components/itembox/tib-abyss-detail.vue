<template>
  <TItemBox :data="character as Record<string,string|number>" size="70px" display="inner" model-value="abyss-detail" />
</template>
<script lang="ts" setup>
// vue
import { onMounted, ref } from "vue";
import TItemBox from "../main/t-itembox.vue";
// utils
import TGSqlite from "../../plugins/Sqlite";

interface TibAbyssDetailProps {
  modelValue: TGApp.Sqlite.Abyss.CharacterInfo
}

export interface TibAbyssDetailAvatar extends TGApp.Sqlite.Character.AppData {
  value: number,
}

const props = defineProps<TibAbyssDetailProps>();

const character = ref({} as TibAbyssDetailAvatar);

onMounted(async () => {
  const res = await TGSqlite.getAppCharacter(props.modelValue.id);
  character.value = {
    ...res,
    value: props.modelValue.level,
  } as TibAbyssDetailAvatar;
});
</script>
