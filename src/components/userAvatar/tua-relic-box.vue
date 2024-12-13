<template>
  <div class="tua-relic-box" :title="getRelicTitle()">
    <div class="tua-relic-bg">
      <img
        :src="`/icon/bg/${props.modelValue.rarity}-Star.webp`"
        v-if="props.modelValue !== false"
        :alt="`relic${props.position}`"
      />
    </div>
    <div class="tua-relic-icon">
      <img
        :src="`/icon/relic/${props.position}.webp`"
        :alt="`relic${props.position}`"
        v-if="props.modelValue === false"
        class="empty"
      />
      <img :src="props.modelValue.icon" :alt="props.modelValue.name" v-else />
    </div>
  </div>
</template>
<script lang="ts" setup>
import { useUserStore } from "@/store/modules/user.js";

type TuaRelicBoxProps = { modelValue: TGApp.Game.Avatar.Relic | false; position: number };

const props = defineProps<TuaRelicBoxProps>();
const userStore = useUserStore();

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

function getRelicTitle(): string {
  const posName = getRelicPosName();
  if (props.modelValue === false) return `${posName}：未装备`;
  const relicProps: string[] = [];
  const mainProp = userStore.getProp(props.modelValue.main_property.property_type);
  relicProps.push(
    `主词条：${mainProp === false ? "未知属性" : mainProp.name} ${props.modelValue.main_property.value}`,
  );
  relicProps.push("副词条：");
  for (const relicProp of props.modelValue.sub_property_list) {
    const subProp = userStore.getProp(relicProp.property_type);
    relicProps.push(
      `  ${subProp === false ? "未知属性" : subProp.name} ${relicProp.value}(+${relicProp.times})`,
    );
  }
  return `${posName}：\n${props.modelValue.name} Lv.${props.modelValue.level}\n${relicProps.join("\n")}`;
}
</script>
<style lang="css" scoped>
.tua-relic-box {
  position: relative;
  width: 30px;
  height: 30px;
  border-radius: 5px;
}

.tua-relic-icon {
  position: relative;
  width: 100%;
  height: 100%;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .empty {
    padding: 5px;
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
  border-radius: 5px;
  background: var(--box-bg-3);

  img {
    width: 100%;
    height: 100%;
    border-radius: 5px;
    object-fit: cover;
  }
}
</style>
