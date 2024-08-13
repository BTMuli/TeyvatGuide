<template>
  <component
    v-for="(ta, index) in parseAnnoContent(props.data)"
    :key="index"
    :is="getTaName(ta)"
    :data="ta"
  />
</template>
<script lang="ts" setup>
import { parseAnnoContent } from "../../web/utils/annoParser.js";
import TpBackupText from "../post/tp-backupText.vue";
import TpImage from "../post/tp-image.vue";
import TpText from "../post/tp-text.vue";
import TpTexts from "../post/tp-texts.vue";
import TpUnknown from "../post/tp-unknown.vue";

interface TaParserProps {
  data: TGApp.BBS.Announcement.ContentItem;
}

const props = defineProps<TaParserProps>();

function getTaName(ta: TGApp.Plugins.Mys.SctPost.Base) {
  if (ta.children) return TpTexts;
  if (typeof ta.insert === "string") return TpText;
  if ("image" in ta.insert) return TpImage;
  if ("backup_text" in ta.insert) return TpBackupText;
  return TpUnknown;
}
</script>
