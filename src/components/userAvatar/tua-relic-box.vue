<template>
  <div class="tua-relic-box" :title="hoverTitle" @mouseenter="ensureTitle">
    <div class="tua-relic-bg">
      <img
        v-if="props.modelValue !== false"
        :alt="`relic${props.position}`"
        decoding="async"
        :src="`/icon/bg/${props.modelValue.rarity}-Star.webp`"
      />
    </div>
    <div class="tua-relic-icon">
      <img
        v-if="props.modelValue === false"
        :alt="`relic${props.position}`"
        class="empty"
        decoding="async"
        :src="`/icon/relic/${props.position}.webp`"
      />
      <img v-else :alt="props.modelValue.name" decoding="async" :src="props.modelValue.icon" />
    </div>
  </div>
</template>
<script lang="ts" setup>
import wikiUtils from "@utils/wikiUtils.js";
import { ref } from "vue";

type TuaRelicBoxProps = { modelValue: TGApp.Game.Avatar.Relic | false; position: number };

const props = defineProps<TuaRelicBoxProps>();
const hoverTitle = ref<string>("");

function ensureTitle(): void {
  if (hoverTitle.value !== "") return;
  hoverTitle.value = buildRelicTitle();
}

function buildRelicTitle(): string {
  const posName = getRelicPosName();
  if (props.modelValue === false) return `${posName}：未装备`;
  const relicProps: Array<string> = [];
  const mainProp = wikiUtils.getProp(props.modelValue.main_property.property_type);
  relicProps.push(
    `主词条：${mainProp === false ? "未知属性" : mainProp.name} ${props.modelValue.main_property.value}`,
  );
  relicProps.push("副词条：");
  for (const relicProp of props.modelValue.sub_property_list) {
    const subProp = wikiUtils.getProp(relicProp.property_type);
    relicProps.push(
      `  ${subProp === false ? "未知属性" : subProp.name} ${relicProp.value}(+${relicProp.times})`,
    );
  }
  return `${posName}：\n${props.modelValue.name} Lv.${props.modelValue.level}\n${relicProps.join("\n")}`;
}

function getRelicPosName(): string {
  switch (props.position) {
    case 1:
      return "生之花";
    case 2:
      return "死之羽";
    case 3:
      return "时之沙";
    case 4:
      return "空之杯";
    case 5:
      return "理之冠";
    default:
      return "未知";
  }
}
</script>
<style lang="css" scoped>
.tua-relic-box {
  position: relative;
  width: 30px;
  height: 30px;
  border-radius: 2px;
}

.tua-relic-icon {
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .empty {
    width: 60%;
    height: 60%;
    padding: 0;
  }
}

.tua-relic-bg {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  border-radius: 2px;
  background: var(--box-bg-3);

  img {
    width: 100%;
    height: 100%;
    border-radius: 2px;
    object-fit: cover;
  }
}
</style>
