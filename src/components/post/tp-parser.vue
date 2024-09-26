<template>
  <component
    v-for="(tp, index) in getParsedData(props.data)"
    :key="index"
    :is="getTpName(tp)"
    :data="tp"
  />
</template>
<script lang="ts" setup>
import TpBackupText from "./tp-backupText.vue";
import TpDivider from "./tp-divider.vue";
import TpImage from "./tp-image.vue";
import TpLinkCard from "./tp-linkCard.vue";
import TpMention from "./tp-mention.vue";
import TpText, { type TpText as TpTextType } from "./tp-text.vue";
import TpTexts from "./tp-texts.vue";
import TpUnknown from "./tp-unknown.vue";
import TpVideo from "./tp-video.vue";
import TpVod from "./tp-vod.vue";
import TpVote from "./tp-vote.vue";

interface TpParserProps {
  data: TGApp.Plugins.Mys.SctPost.Base[];
}

const props = defineProps<TpParserProps>();

function getParsedData(data: TGApp.Plugins.Mys.SctPost.Base[]): TGApp.Plugins.Mys.SctPost.Base[] {
  const res: TGApp.Plugins.Mys.SctPost.Base[] = [];
  let child: TGApp.Plugins.Mys.SctPost.Base[] = [];
  let cur: TGApp.Plugins.Mys.SctPost.Base | undefined;
  for (const tp of data) {
    const tpName = getTpName(tp);
    // 单独处理 TpMention
    if (tpName === TpMention) {
      child.push(tp);
      continue;
    }
    if (tpName !== TpText) {
      cur = tp;
      child = [];
      res.push(cur);
      continue;
    }
    tp.insert = tp.insert.replace(/\r/g, "\n");
    if (tp.insert === "\n") {
      child.push(tp);
      cur = {
        insert: "",
        attributes: tp.attributes,
        children: child,
      };
      res.push(cur);
      child = [];
      continue;
    }
    const parsedText = getParsedText(tp);
    let check = 0;
    for (let i = 0; i < parsedText.length; i++) {
      const text = parsedText[i];
      child.push(text);
      if (text.insert === "\n") {
        check += child.length;
        cur = {
          insert: "",
          attributes: text.attributes,
          children: child,
        };
        res.push(cur);
        child = [];
      }
    }
    if (check < parsedText.length && check !== 0) {
      res.push(...child);
      child = [];
    }
  }
  if (res.length === 0 && child.length > 0) res.push(...child);
  return res;
}

function getParsedText(data: TpTextType): TpTextType[] {
  if (data.insert.includes("\n") && data.insert !== "\n") {
    const splits = data.insert.split("\n");
    const res = [];
    for (let i = 0; i < splits.length; i++) {
      if (splits[i] !== "") {
        res.push({ insert: splits[i], attributes: data.attributes });
      }
      if (i !== splits.length - 1) {
        res.push({ insert: "\n", attributes: data.attributes });
      }
    }
    return res;
  }
  return [data];
}

function getTpName(tp: TGApp.Plugins.Mys.SctPost.Base) {
  if (tp.children) return TpTexts;
  if (typeof tp.insert === "string") return TpText;
  if ("image" in tp.insert) return TpImage;
  if ("vod" in tp.insert) return TpVod;
  if ("video" in tp.insert) return TpVideo;
  if ("backup_text" in tp.insert) return TpBackupText;
  if ("link_card" in tp.insert) return TpLinkCard;
  if ("divider" in tp.insert) return TpDivider;
  if ("mention" in tp.insert) return TpMention;
  if ("vote" in tp.insert) return TpVote;
  return TpUnknown;
}
</script>
