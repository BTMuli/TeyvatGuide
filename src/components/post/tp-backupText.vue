<template>
  <div v-if="props.data.insert.lottery" @click="toLottery()" class="mys-post-link">
    <v-icon size="small">mdi-gift</v-icon>
    <span>{{ props.data.insert.lottery.toast }}</span>
  </div>
  <div v-else-if="props.data.insert.fold" class="mys-post-div">
    <details class="mys-post-details">
      <summary>
        <TpParser :data="JSON.parse(props.data.insert.fold.title)" />
      </summary>
      <TpParser :data="JSON.parse(props.data.insert.fold.content)" />
    </details>
  </div>
  <TpUnknown v-else :data="<TGApp.Plugins.Mys.SctPost.Empty>props.data" />
</template>
<script lang="ts" setup>
import { useRouter } from "vue-router";

import TpParser from "./tp-parser.vue";
import TpUnknown from "./tp-unknown.vue";

interface TpBackupText {
  insert: {
    backup_text: string;
    fold?: {
      title: string;
      content: string;
    };
    lottery?: {
      id: string;
      toast: string;
    };
  };
}

interface TpBackupTextProps {
  data: TpBackupText;
}

const props = defineProps<TpBackupTextProps>();
const router = useRouter();

async function toLottery() {
  if (!props.data.insert.lottery) return;
  await router.push({
    name: "抽奖详情",
    params: {
      lottery_id: props.data.insert.lottery.id,
    },
  });
}
</script>
