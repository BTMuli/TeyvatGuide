<template>
  <component
    v-for="(ta, index) in parseAnnoContent(props.data)"
    :key="index"
    :is="getTaName(ta)"
    :data="ta"
  />
</template>
<script lang="ts" setup>
import TpBackupText from "@comp/viewPost/tp-backupText.vue";
import TpImage from "@comp/viewPost/tp-image.vue";
import TpText from "@comp/viewPost/tp-text.vue";
import TpTexts from "@comp/viewPost/tp-texts.vue";
import TpUnknown from "@comp/viewPost/tp-unknown.vue";
import type { Component } from "vue";

import TaTable from "./ta-table.vue";

import parseAnnoContent from "@/web/utils/annoParser.js";

type TaParserProps = { data: TGApp.BBS.Announcement.ContentItem };
const props = defineProps<TaParserProps>();

function getTaName(ta: TGApp.BBS.SctPost.Base): Component {
  if (ta.children) return TpTexts;
  if (typeof ta.insert === "string") return TpText;
  if ("image" in ta.insert) return TpImage;
  if ("backup_text" in ta.insert) return TpBackupText;
  if ("table" in ta.insert) return TaTable;
  return TpUnknown;
}
</script>
