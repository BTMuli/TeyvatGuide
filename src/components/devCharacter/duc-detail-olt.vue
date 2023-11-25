<template>
  <div class="ddo-lt-box">
    <div class="ddo-ltb-icon" :title="getTitle">
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
import { computed } from "vue";

import TItemBox, { TItemBoxData } from "../main/t-itembox.vue";

type DucDetailOltProps =
  | {
      data: TGApp.Sqlite.Character.UserRole;
      mode: "avatar";
    }
  | {
      data: TGApp.Sqlite.Character.RoleWeapon;
      mode: "weapon";
    };

const props = defineProps<DucDetailOltProps>();
const getTitle = computed(() => {
  if (props.mode === "avatar") {
    return `${props.data.name}`;
  } else {
    const descriptionList = props.data.description.split("");
    return descriptionList.reduce((prev: string, cur: string, index: number) => {
      if (index % 10 === 0) {
        return `${prev}\n${cur}`;
      } else {
        return `${prev}${cur}`;
      }
    }, "");
  }
});
const boxData = computed<TItemBoxData>(() => {
  if (props.mode === "avatar") {
    return {
      bg: `/icon/bg/${props.data.star}-Star.webp`,
      icon: `/WIKI/character/icon/${props.data.cid}.webp`,
      size: "100px",
      height: "100px",
      display: "inner",
      innerHeight: 0,
      innerText: "",
      clickable: false,
      lt: `/icon/element/${props.data.element}.webp`,
      ltSize: "30px",
    };
  } else {
    return {
      bg: `/icon/bg/${props.data.star}-Star.webp`,
      icon: `/WIKI/weapon/icon/${props.data.id}.webp`,
      size: "100px",
      height: "100px",
      display: "inner",
      innerHeight: 0,
      innerText: "",
      clickable: false,
      lt: `/icon/weapon/${props.data.type}.webp`,
      ltSize: "30px",
    };
  }
});
const info = computed(() => {
  if (props.mode === "avatar") {
    return `好感 ${props.data.fetter}`;
  } else {
    return `精炼 ${props.data.affix}`;
  }
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
