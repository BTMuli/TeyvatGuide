<template>
  <component v-for="(tp, index) in props.data" :key="index" :is="getTpName(tp)" :data="tp" />
</template>
<script lang="ts" setup>
import TpBackupText from "./tp-backupText.vue";
import TpDivider from "./tp-divider.vue";
import TpImage from "./tp-image.vue";
import TpLinkCard from "./tp-linkCard.vue";
import TpMention from "./tp-mention.vue";
import TpText from "./tp-text.vue";
import TpUnknown from "./tp-unknown.vue";
import TpVillaCard from "./tp-villaCard.vue";
import TpVod from "./tp-vod.vue";

interface TpParserProps {
  data: TGApp.Plugins.Mys.SctPost.Base[];
}

const props = defineProps<TpParserProps>();

function getTpName(tp: TGApp.Plugins.Mys.SctPost.Base) {
  if (typeof tp.insert === "string") {
    return TpText;
  } else if ("image" in tp.insert) {
    return TpImage;
  } else if ("vod" in tp.insert) {
    return TpVod;
    // } else if ("video" in tp.insert) {
    //   return TpVideo;
  } else if ("backup_text" in tp.insert) {
    return TpBackupText;
  } else if ("link_card" in tp.insert) {
    return TpLinkCard;
  } else if ("divider" in tp.insert) {
    return TpDivider;
  } else if ("mention" in tp.insert) {
    return TpMention;
  } else if ("villa_card" in tp.insert) {
    return TpVillaCard;
  }
  return TpUnknown;
}
</script>
