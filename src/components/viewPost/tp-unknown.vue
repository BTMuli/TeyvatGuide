<template>
  <div class="tp-unknown-box">
    <code class="tp-unknown-code">{{ JSON.stringify(props.data, null, 2) }}</code>
  </div>
</template>
<script lang="ts" setup>
import TGLogger from "@utils/TGLogger.js";
import { onMounted, toRaw } from "vue";

type TpUnknownProps = { data: TGApp.BBS.SctPost.Empty };

const props = defineProps<TpUnknownProps>();

console.warn("tpUnknown", toRaw(props.data.insert));

onMounted(async () => {
  await TGLogger.Warn(
    `[tpUnknown][onMounted] 未知的插件数据 ${JSON.stringify(toRaw(props.data))}}`,
  );
});
</script>
<style lang="css" scoped>
.tp-unknown-box {
  width: 800px;
  max-width: 100%;
  padding: 10px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 10px;
  background: var(--box-bg-1);
}

.tp-unknown-code {
  font-family: var(--font-text);
  opacity: 0.6;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
