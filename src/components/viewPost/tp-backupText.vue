<template>
  <span
    v-if="props.data.insert.lottery"
    @click="showLottery = !showLottery"
    class="tp-backup-lottery"
    :title="`ID: ${props.data.insert.lottery.id}`"
  >
    <v-icon size="16">mdi-gift</v-icon>
    <span>{{ props.data.insert.lottery.toast }}</span>
  </span>
  <VpOverlayLottery
    v-if="props.data.insert.lottery"
    v-model="showLottery"
    :lottery="props.data.insert.lottery.id"
  />
  <details v-else-if="props.data.insert.fold" class="tp-backup-fold">
    <summary class="tp-backup-summary">
      <img alt="marker" src="/source/post/fold_marker.webp" class="tp-backup-marker" />
      <TpParser :data="JSON.parse(props.data.insert.fold.title)" />
    </summary>
    <div class="tp-backup-details">
      <TpParser :data="JSON.parse(props.data.insert.fold.content)" />
    </div>
  </details>
  <TpUnknown v-else :data="<TGApp.BBS.SctPost.Empty>props.data" />
</template>
<script lang="ts" setup>
import { ref, toRaw } from "vue";

import TpParser from "./tp-parser.vue";
import TpUnknown from "./tp-unknown.vue";
import VpOverlayLottery from "./vp-overlay-lottery.vue";

type TpBackupText = {
  insert: {
    backup_text: string;
    fold?: { title: string; content: string };
    lottery?: { id: string; toast: string };
  };
};
type TpBackupTextProps = { data: TpBackupText };

const props = defineProps<TpBackupTextProps>();
const showLottery = ref<boolean>(false);

console.log("tpBackupText", props.data.insert.backup_text, toRaw(props.data));
</script>
<style lang="css" scoped>
.tp-backup-lottery {
  margin-right: 4px;
  color: #00c3ffff;
  cursor: pointer;

  :first-child {
    margin-right: 2px;
  }
}

.tp-backup-fold {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--common-shadow-2);
  border-radius: 4px;
  margin: 8px auto;
}

.tp-backup-summary {
  position: relative;
  display: flex;
  width: 100%;
  box-sizing: border-box;
  align-items: center;
  justify-content: flex-start;
  padding: 8px;
  background: var(--box-bg-1);
  cursor: pointer;
  font-family: var(--font-title);
}

.tp-backup-marker {
  position: relative;
  display: inline;
  width: 24px;
  height: 24px;
  margin-right: 4px;
}

.tp-backup-details {
  position: relative;
  width: 100%;
  box-sizing: border-box;
  padding: 8px 8px 8px 24px;
  border-top: 1px solid var(--common-shadow-1);
}
</style>
