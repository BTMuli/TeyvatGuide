<template>
  <div class="twc-constellations-box">
    <div class="twc-constellations-title">命座</div>
    <div class="twc-constellation" v-for="item in props.data" :key="item.Id">
      <div class="twc-constellation-top">
        <!-- todo 换成本地资源 -->
        <img :src="`https://api.ambr.top/assets/UI/${item.Icon}.png`" alt="icon" />
        <span>{{ item.Name }}</span>
      </div>
      <div class="twc-constellation-bottom">
        <span v-html="parseDesc(item.Description)"></span>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
interface TwcConstellationProps {
  data: TGApp.Plugins.Hutao.Character.RhisdTalent[];
}
const props = defineProps<TwcConstellationProps>();

function parseDesc(desc: string): string {
  const reg = /<color=(.*?)>(.*?)<\/color>/g;
  let match = reg.exec(desc);
  while (match !== null) {
    const color = match[1];
    const text = match[2];
    desc = desc.replace(
      match[0],
      `<span title="${text}" style="color: ${color};font-weight: bold;">${text}</span>`,
    );
    match = reg.exec(desc);
  }
  desc = desc.replace(/\\n/g, "<br />");
  return desc;
}
</script>
<style lang="css" scoped>
.twc-constellations-box {
  display: flex;
  flex-direction: column;
  row-gap: 5px;
}

.twc-constellations-title {
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 18px;
}

.twc-constellation {
  display: flex;
  flex-direction: column;
  padding: 5px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 5px;
  row-gap: 5px;
}

.twc-constellation-top {
  display: flex;
  align-items: flex-end;
  justify-content: flex-start;
  gap: 5px;
}

.twc-constellation-top img {
  width: 30px;
  height: 30px;
  padding: 2px;
  border-radius: 5px;
  background: var(--common-shadow-4);
}

.twc-constellation-top span {
  border-bottom: 1px solid var(--common-shadow-4);
  font-weight: bold;
}

.twc-constellation-bottom {
  white-space: pre-wrap;
}
</style>
