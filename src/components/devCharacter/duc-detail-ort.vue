<template>
  <div class="duc-dort-box">
    <div :title="talent.name" v-for="talent in talents" :key="talent.pos" class="duc-dort-item">
      <span>{{ talent.name }}</span>
      <img :src="talent.icon" alt="talent" />
      <span>Lv.{{ talent.level }}</span>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { onMounted, onUpdated, ref } from "vue";

import { saveImgLocal } from "../../utils/TGShare";

interface DucDetailOrtProps {
  modelValue: TGApp.Sqlite.Character.RoleTalent[];
}

const props = defineProps<DucDetailOrtProps>();
const talents = ref<TGApp.Sqlite.Character.RoleTalent[]>([]);

async function loadData(): Promise<void> {
  const tempTalent = props.modelValue;
  for (const talent of tempTalent) {
    if (talent.icon.startsWith("blob:")) return;
    talent.icon = await saveImgLocal(talent.icon);
  }
  talents.value = tempTalent;
}

onMounted(async () => {
  await loadData();
});

onUpdated(async () => {
  await loadData();
});
</script>
<style lang="css" scoped>
.duc-dort-box {
  display: flex;
  flex-direction: column;
  row-gap: 10px;
}

.duc-dort-item {
  display: flex;
  justify-content: flex-end;
  column-gap: 10px;
}

.duc-dort-item img {
  width: 40px;
  height: 40px;
  padding: 5px;
  border-radius: 50%;
  -webkit-backdrop-filter: blur(5px);
  backdrop-filter: blur(5px);
  background: rgba(0 0 0 /40%);
}

.duc-dort-item span {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--tgc-white-1);
  font-family: var(--font-title);
  font-size: 16px;
  text-shadow: 0 0 5px rgba(0 0 0/40%);
}

.duc-dort-item :nth-last-child(1) {
  width: 48px;
  justify-content: flex-start;
}
</style>
