<template>
  <div
    v-if="props.data.insert.lottery"
    @click="toLottery()"
    class="tp-backup-lottery"
    :title="`ID: ${props.data.insert.lottery.id}`"
  >
    <v-icon size="small">mdi-gift</v-icon>
    <span>{{ props.data.insert.lottery.toast }}</span>
  </div>
  <details v-else-if="props.data.insert.fold" class="tp-backup-fold">
    <summary class="tp-backup-summary">
      <img alt="marker" src="/source/post/fold_marker.webp" class="tp-backup-marker" />
      <TpParser :data="JSON.parse(props.data.insert.fold.title)" />
    </summary>
    <div class="tp-backup-details">
      <TpParser :data="JSON.parse(props.data.insert.fold.content)" />
    </div>
  </details>
  <TpUnknown v-else :data="<TGApp.Plugins.Mys.SctPost.Empty>props.data" />
</template>
<script lang="ts" setup>
import { toRaw } from "vue";
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
  next: unknown;
}

const props = defineProps<TpBackupTextProps>();
const router = useRouter();

console.log("tpBackupText", props.data.insert.backup_text, toRaw(props.data));

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
<style lang="css" scoped>
.tp-backup-lottery {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #00c3ff;
  column-gap: 5px;
  cursor: pointer;
}

.tp-backup-fold {
  position: relative;
  padding: 10px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 10px;
  margin: 10px auto;
}

.tp-backup-fold summary {
  list-style: none;
}

.tp-backup-fold ::marker {
  color: var(--common-shadow-4);
  content: "";
}

.tp-backup-summary {
  display: flex;
  margin-left: 5px;
  font-family: var(--font-title);
}

.tp-backup-marker {
  position: relative;
  display: inline;
  width: 20px;
  height: 20px;
}

.tp-backup-details {
  padding-left: 20px;
}
</style>
