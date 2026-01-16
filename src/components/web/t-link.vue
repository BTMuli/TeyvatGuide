<template>
  <span
    style="cursor: pointer"
    @click="showOverlay()"
    v-html="parseHtmlText(decodeURIComponent(props.content))"
  />
</template>
<script lang="ts" setup>
import showHyperLink from "@comp/func/hyperlink.js";
import showSnackbar from "@comp/func/snackbar.js";
import { parseHtmlText } from "@utils/toolFunc.js";
import { defineProps, onMounted, shallowRef } from "vue";

import { WikiHyperLinkData } from "@/data/index.js";

type TLinkProps = { link: string; content: string };
const props = defineProps<TLinkProps>();

const info = shallowRef<TGApp.App.HyperLink.HyperLinkItem>();

onMounted(async () => {
  const find = WikiHyperLinkData.find((i) => i.id.toString() === props.link.slice(1));
  if (find) info.value = find;
});

async function showOverlay() {
  if (!info.value) {
    showSnackbar.warn("未获取到对应HyperLink数据");
    return;
  }
  await showHyperLink({ ...info.value, id: props.link });
}
</script>
