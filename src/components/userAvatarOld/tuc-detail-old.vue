<template>
  <div class="tuc-do-box">
    <div class="tuc-do-bg">
      <TMiImg :ori="true" :src="bg" alt="role" />
    </div>
    <div class="tuc-do-show">
      <div class="tuc-do-main">
        <div class="tuc-do-left">
          <div
            class="tuc-dol-item"
            :class="{ selected: selected.pos === 0 }"
            @click="showDetail(props.modelValue.weapon, '武器', 0)"
          >
            <TucDetailItemBox
              :icon="`/WIKI/weapon/${props.modelValue.weapon.id}.webp`"
              :bg="`/icon/bg/${props.modelValue.weapon.rarity}-Star.webp`"
            />
          </div>
          <div
            v-for="(item, index) in relicList"
            :key="index"
            class="tuc-dol-item"
            :class="{ selected: selected.pos === index + 1 }"
            @click="showDetail(item, '圣遗物', index + 1)"
          >
            <TucDetailRelic :model-value="item" :pos="index + 1" />
          </div>
        </div>
        <div class="tuc-do-right">
          <div class="tuc-dor-box">
            <TucDetailConstellation
              v-for="item in props.modelValue.constellations"
              :key="item.pos"
              class="tuc-dor-item"
              :model-value="item"
              :class="{ selected: selected.pos === item.pos + 5 }"
              @click="showDetail(item, '命座', item.pos + 5)"
            />
          </div>
        </div>
        <div v-if="props.modelValue.costumes.length > 0" class="tuc-do-costume">
          <v-switch
            density="compact"
            hide-details
            v-model="showCostumeSwitch"
            color="#fb7299"
            @click="switchBg"
          >
            <template #label>
              <v-icon>mdi-tshirt-crew-outline</v-icon>
            </template>
          </v-switch>
        </div>
        <div v-if="showCostumeSwitch" class="tuc-do-costume-name">
          {{ props.modelValue.costumes[0].name }}
        </div>
      </div>
      <div class="tuc-do-bottom">
        <TucDetailDescWeapon
          v-if="selected.type === '武器'"
          :model-value="props.modelValue.weapon"
        />
        <TucDetailDescConstellation
          v-if="selected.type === '命座' && selectConstellation"
          :model-value="selectConstellation"
        />
        <TucDetailDescRelic
          v-if="selected.type === '圣遗物' && selectRelic"
          :model-value="selectRelic"
        />
      </div>
      <div class="tuc-do-quote">* 所有数据以游戏内为准，此处仅供参考</div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import TMiImg from "@comp/app/t-mi-img.vue";
import { computed, onMounted, ref, shallowRef, watch } from "vue";

import TucDetailConstellation from "./tuc-detail-constellation.vue";
import TucDetailDescConstellation from "./tuc-detail-desc-constellation.vue";
import TucDetailDescRelic from "./tuc-detail-desc-relic.vue";
import TucDetailDescWeapon from "./tuc-detail-desc-weapon.vue";
import TucDetailItemBox from "./tuc-detail-itembox.vue";
import TucDetailRelic from "./tuc-detail-relic.vue";

type ToUcDetailProps = { modelValue: TGApp.Sqlite.Character.UserRole };
type ToUcDetailSelect = { type: "命座" | "武器" | "圣遗物"; pos: number };
type fixedLenArr<T, N extends number> = [T, ...Array<T>] & { length: N };
type RelicList = fixedLenArr<TGApp.Game.Avatar.Relic | false, 5>;

const props = defineProps<ToUcDetailProps>();
const relicList = computed<RelicList>(() => {
  return [
    props.modelValue.relics.find((item) => item.pos === 1) || false,
    props.modelValue.relics.find((item) => item.pos === 2) || false,
    props.modelValue.relics.find((item) => item.pos === 3) || false,
    props.modelValue.relics.find((item) => item.pos === 4) || false,
    props.modelValue.relics.find((item) => item.pos === 5) || false,
  ];
});
const showCostumeSwitch = ref<boolean>(false);
const selectConstellation = shallowRef<TGApp.Game.Avatar.Constellation>();
const selectRelic = shallowRef<TGApp.Game.Avatar.Relic>();
const selected = shallowRef<ToUcDetailSelect>({ type: "武器", pos: 0 });
const bg = computed<string>(() =>
  showCostumeSwitch.value ? props.modelValue.costumes[0].icon : props.modelValue.avatar.image,
);
const bgTransY = computed<string>(() => (showCostumeSwitch.value ? "0" : "10px"));
const bgFit = computed<string>(() => (showCostumeSwitch.value ? "cover" : "contain"));

// 加载数据
function loadData(): void {
  selected.value = { type: "武器", pos: 0 };
  selectConstellation.value = undefined;
  selectRelic.value = undefined;
  showCostumeSwitch.value = false;
}

onMounted(() => loadData());
watch(() => props.modelValue, loadData);

function showDetail(
  item:
    | TGApp.Game.Avatar.Constellation
    | TGApp.Game.Avatar.WeaponDetail
    | TGApp.Game.Avatar.Relic
    | false,
  selectType: "命座" | "武器" | "圣遗物",
  selectPos: number,
): void {
  if (!item) return;
  switch (selectType) {
    case "命座":
      selectConstellation.value = <TGApp.Game.Avatar.Constellation>item;
      break;
    case "武器":
      break;
    case "圣遗物":
      selectRelic.value = <TGApp.Game.Avatar.Relic>item;
      break;
    default:
      break;
  }
  selected.value = { type: selectType, pos: selectPos };
}

function switchBg(): void {
  showCostumeSwitch.value = !showCostumeSwitch.value;
}
</script>
<style lang="css" scoped>
.tuc-do-box {
  position: relative;
  overflow: hidden;
  width: 450px;
  height: 600px;
  border-radius: 5px;
  background: var(--box-bg-1);
}

.tuc-do-bg {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  width: 100%;
  max-height: 100%;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  margin: 0 auto;
  object-fit: v-bind(bgFit);
  transform: translateY(v-bind(bgTransY));

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
}

.tuc-do-costume {
  position: absolute;
  z-index: 1;
  top: 5px;
  right: 5px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px;
  border-radius: 5px;
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  background: var(--common-shadow-2);
  color: var(--tgc-pink-1);
}

.tuc-do-costume-name {
  position: absolute;
  right: 10px;
  bottom: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 5px;
  border-radius: 5px;
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  background: var(--common-shadow-2);
  color: var(--tgc-yellow-1);
  font-family: var(--font-title);
  text-shadow: 0 0 5px var(--tgc-dark-1);
}

.tuc-do-show {
  position: relative;
  display: flex;
  height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
}

.tuc-do-main {
  position: relative;
  display: flex;
  width: 100%;
  height: 360px;
  align-items: center;
  justify-content: space-between;
}

.tuc-do-left {
  position: relative;
  width: 150px;
  height: 100%;
  padding: 10px;
  column-count: 2;
  column-gap: 10px;
}

.tuc-do-right {
  width: 175px;
  height: 100%;
  margin-right: 20px;
}

.tuc-do-bottom {
  width: 100%;
  padding: 0 10px;
}

.tuc-do-quote {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px 5px;
  margin-top: auto;
  margin-left: auto;
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  background: var(--common-shadow-2);
  border-bottom-right-radius: 5px;
  border-top-left-radius: 5px;
  box-shadow: 2px 2px 5px var(--tgc-dark-1);
  color: var(--tgc-white-1);
  font-size: 14px;
  text-shadow: 0 0 5px var(--tgc-dark-1);
}

/* 左侧显示区域 */
.tuc-dol-item {
  position: relative;
  border-radius: 5px;
  margin-top: 50px;
  cursor: pointer;

  &:nth-child(1) {
    opacity: 0.5;

    &.selected {
      opacity: 1;
    }
  }

  &:nth-child(2),
  &:nth-child(3),
  &:nth-child(4),
  &:nth-child(5),
  &:nth-child(6) {
    cursor: pointer;
    opacity: 0.5;

    &.selected {
      cursor: default;
      opacity: 1;
    }
  }
}

/* 右侧显示区域 */
.tuc-dor-box {
  position: relative;
  width: 100%;
  height: 100%;
}

.tuc-dor-item {
  position: absolute;
  border: unset;
  cursor: pointer;

  &.selected {
    border: 2px solid var(--tgc-yellow-1);
  }
}

/* 环状排列6个命座 */
.tuc-dor-item:nth-child(1) {
  top: 10px;
  left: 10px;
}

.tuc-dor-item:nth-child(2) {
  top: 45px;
  left: 75px;
}

.tuc-dor-item:nth-child(3) {
  top: 110px;
  right: 0;
}

.tuc-dor-item:nth-child(4) {
  right: 0;
  bottom: 110px;
}

.tuc-dor-item:nth-child(5) {
  bottom: 45px;
  left: 75px;
}

.tuc-dor-item:nth-child(6) {
  bottom: 10px;
  left: 10px;
}
</style>
