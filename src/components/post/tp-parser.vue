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
    for (const text of parsedText) {
      child.push(text);
      if (text.insert === "\n") {
        cur = {
          insert: "",
          attributes: text.attributes,
          children: child,
        };
        res.push(cur);
        child = [];
      }
    }
  }
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
  if (typeof tp.insert === "string") {
    return TpText;
  } else if ("image" in tp.insert) {
    return TpImage;
  } else if ("vod" in tp.insert) {
    return TpVod;
  } else if ("video" in tp.insert) {
    return TpVideo;
  } else if ("backup_text" in tp.insert) {
    return TpBackupText;
  } else if ("link_card" in tp.insert) {
    return TpLinkCard;
  } else if ("divider" in tp.insert) {
    return TpDivider;
  } else if ("mention" in tp.insert) {
    return TpMention;
  } else if ("vote" in tp.insert) {
    return TpVote;
  }
  return TpUnknown;
}
</script>
