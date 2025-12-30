<template>
  <div class="ddo-lt-box">
    <div :title="title" class="ddo-ltb-icon">
      <TItemBox :model-value="boxData" />
    </div>
    <div class="ddo-ltb-info">
      <span>{{ props.data.name }}</span>
      <span>Lv.{{ props.data.level }}</span>
      <span>{{ info }}</span>
    </div>
  </div>
</template>
<script lang="ts" setup>
import TItemBox, { type TItemBoxData } from "@comp/app/t-itemBox.vue";
import { getZhElement } from "@utils/toolFunc.js";
import { computed } from "vue";

type DucDetailOltProps =
  | {
      data: TGApp.Game.Avatar.Avatar;
      costume: TGApp.App.Character.Costume | false;
      mode: "character";
    }
  | {
      data: TGApp.Game.Avatar.WeaponDetail;
      mode: "weapon";
    };

const props = defineProps<DucDetailOltProps>();

const icon = computed(() => {
  if (props.mode === "weapon" || !props.costume) return `/WIKI/${props.mode}/${props.data.id}.webp`;
  return `/WIKI/costume/${props.costume.id}.webp`;
});
const title = computed<string>(() => {
  if (props.mode === "weapon" || !props.costume) return props.data.name;
  return `${props.data.name}-${props.costume.name}`;
});
const boxData = computed<TItemBoxData>(() => ({
  bg: `/icon/bg/${props.data.rarity}-Star.webp`,
  icon: icon.value,
  size: "100px",
  height: "100px",
  display: "inner",
  innerHeight: 0,
  innerText: "",
  clickable: false,
  lt:
    props.mode === "character"
      ? `/icon/element/${getZhElement(props.data.element)}元素.webp`
      : `/icon/weapon/${props.data.type_name}.webp`,
  ltSize: "30px",
}));
const info = computed<string>(() => {
  if (props.mode === "character") return `好感 ${props.data.fetter}`;
  else return `精炼 ${props.data.affix_level}`;
});
</script>
<style lang="css" scoped>
.ddo-lt-box {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: flex-start;
  column-gap: 10px;
}

.ddo-ltb-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
  color: var(--tgc-white-1);
  text-align: left;
}

.ddo-ltb-info :nth-child(1) {
  margin-bottom: 10px;
  font-family: var(--font-title);
  font-size: 20px;
}

.ddo-ltb-info :not(:nth-child(1)) {
  font-family: var(--font-text);
  font-size: 16px;
  opacity: 0.8;
}
</style>
