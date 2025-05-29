<template>
  <component
    v-for="(tp, index) in getParsedData(props.data)"
    :key="index"
    :is="getTpName(tp)"
    :data="tp"
  />
</template>
<script lang="ts" setup>
import type { Component } from "vue";

import TpBackupText from "./tp-backupText.vue";
import TpDivider from "./tp-divider.vue";
import TpEmoticon from "./tp-emoticon.vue";
import TpGameCard from "./tp-gameCard.vue";
import TpImage from "./tp-image.vue";
import TpLinkCard from "./tp-linkCard.vue";
import TpMention from "./tp-mention.vue";
import TpText, { type TpText as TpTextType } from "./tp-text.vue";
import TpTexts from "./tp-texts.vue";
import TpUid from "./tp-uid.vue";
import TpUnknown from "./tp-unknown.vue";
import TpVideo from "./tp-video.vue";
import TpVillaCard from "./tp-villaCard.vue";
import TpVod from "./tp-vod.vue";
import TpVote from "./tp-vote.vue";

type SctPostDataArr = Array<TGApp.BBS.SctPost.Base>;
type TpParserProps = { data: SctPostDataArr };

const props = defineProps<TpParserProps>();

function getParsedData(data: SctPostDataArr): SctPostDataArr {
  const res: SctPostDataArr = [];
  let child: SctPostDataArr = [];
  let cur: TGApp.BBS.SctPost.Base | undefined;
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
    if (typeof tp.insert === "string") {
      tp.insert = tp.insert.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    }
    if (tp.insert === "\n") {
      child.push(tp);
      cur = { insert: "", attributes: tp.attributes, children: child };
      res.push(cur);
      child = [];
      continue;
    }
    const parsedText = getParsedText(<TpTextType>tp);
    let check = 0;
    for (let i = 0; i < parsedText.length; i++) {
      const text = parsedText[i];
      child.push(text);
      if (text.insert === "\n") {
        check += child.length;
        cur = { insert: "", attributes: text.attributes, children: child };
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

function getParsedText(data: TpTextType): Array<TpTextType> {
  if (data.insert.includes("\n") && data.insert !== "\n") {
    const splits = data.insert.split("\n");
    const res = [];
    for (let i = 0; i < splits.length; i++) {
      if (splits[i] !== "") res.push({ insert: splits[i], attributes: data.attributes });
      if (i !== splits.length - 1) res.push({ insert: "\n", attributes: data.attributes });
    }
    return res;
  }
  return [data];
}

function getTpName(tp: TGApp.BBS.SctPost.Base): Component {
  if (tp.children) return TpTexts;
  if (typeof tp.insert === "string") return TpText;
  // game_user_info属于backup_text的一种，必须放在backup_text判断的前面
  if ("game_user_info" in tp.insert) return TpUid;
  if ("backup_text" in tp.insert) {
    if (tp.insert.backup_text === "[游戏卡片]" && "reception_card" in tp.insert) return TpGameCard;
    if (tp.insert.backup_text === "[自定义表情]" && "custom_emoticon" in tp.insert) {
      return TpEmoticon;
    }
    return TpBackupText;
  }
  if ("divider" in tp.insert) return TpDivider;
  if ("image" in tp.insert) return TpImage;
  if ("link_card" in tp.insert) return TpLinkCard;
  if ("mention" in tp.insert) return TpMention;
  if ("video" in tp.insert) return TpVideo;
  if ("villa_card" in tp.insert) return TpVillaCard;
  if ("vod" in tp.insert) return TpVod;
  if ("vote" in tp.insert) return TpVote;
  return TpUnknown;
}
</script>
