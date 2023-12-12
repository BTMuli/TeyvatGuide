<template>
  <TOverlay v-model="visible" hide :to-click="onCancel" blur-val="20px">
    <div class="tuc-do-div">
      <!-- 左侧箭头 -->
      <div class="tuc-arrow-left" @click="handleClick('left')">
        <img src="../../assets/icons/arrow-right.svg" alt="left" />
      </div>
      <!-- 中间内容 -->
      <div class="tuc-do-box">
        <div class="tuc-do-bg">
          <img
            :src="data.bg"
            alt="role"
            :style="{
              objectFit: data.bgFit,
            }"
          />
        </div>
        <div class="tuc-do-quote">* 所有数据以游戏内为准，此处仅供参考</div>
        <!-- 衣装 -->
        <div v-if="data.costume.length > 0" class="tuc-do-costume">
          <v-switch v-model="showCostumeSwitch" color="#fb7299" @click="switchBg">
            <template #label>
              <v-icon>mdi-tshirt-crew-outline</v-icon>
            </template>
          </v-switch>
        </div>
        <div v-if="showCostumeSwitch" class="tuc-do-costume-name">
          {{ data.costume[0].name }}
        </div>
        <div v-if="data" class="tuc-do-show">
          <!-- 左侧武器跟圣遗物 -->
          <div class="tuc-do-left">
            <div
              class="tuc-dol-item"
              :style="{
                opacity: selected.pos === 0 ? '1' : '0.5',
              }"
              @click="showDetail(data.weapon, '武器', 0)"
            >
              <TucDetailItemBox v-model="weaponBox" />
            </div>
            <div
              v-for="(item, index) in data.reliquary"
              :key="index"
              class="tuc-dol-item"
              :style="{
                cursor: item ? 'pointer' : 'default',
                opacity: selected.pos === index + 1 ? '1' : item ? '0.5' : '1',
              }"
              @click="showDetail(item, '圣遗物', index + 1)"
            >
              <TucDetailRelic :model-value="item" :pos="index + 1" />
            </div>
          </div>
          <!-- 右侧环状排列6个命座 -->
          <div class="tuc-do-right">
            <div class="tuc-dor-box">
              <TucDetailConstellation
                v-for="item in data.constellation"
                :key="item.pos"
                class="tuc-dor-item"
                :model-value="item"
                :style="{
                  border: selected.pos === item.pos + 5 ? '2px solid var(--tgc-yellow-1)' : '',
                }"
                @click="showDetail(item, '命座', item.pos + 5)"
              />
            </div>
          </div>
          <!-- 底部说明 -->
          <div class="tuc-do-bottom">
            <TucDetailDescWeapon v-if="selected.type === '武器'" v-model="selectWeapon" />
            <TucDetailDescConstellation
              v-if="selected.type === '命座'"
              v-model="selectConstellation"
            />
            <TucDetailDescRelic v-if="selected.type === '圣遗物'" v-model="selectRelic" />
          </div>
        </div>
      </div>
      <!-- 右侧箭头 -->
      <div class="tuc-arrow-right" @click="handleClick('right')">
        <img src="../../assets/icons/arrow-right.svg" alt="right" />
      </div>
    </div>
  </TOverlay>
</template>
<script lang="ts" setup>
import { computed, onMounted, onUpdated, ref } from "vue";

import TucDetailConstellation from "./tuc-detail-constellation.vue";
import TucDetailDescConstellation from "./tuc-detail-desc-constellation.vue";
import TucDetailDescRelic from "./tuc-detail-desc-relic.vue";
import TucDetailDescWeapon from "./tuc-detail-desc-weapon.vue";
import TucDetailItemBox from "./tuc-detail-itembox.vue";
import TucDetailRelic from "./tuc-detail-relic.vue";
import TOverlay from "../main/t-overlay.vue";

interface ToUcDetailProps {
  modelValue: boolean;
  dataVal: TGApp.Sqlite.Character.UserRole;
}

interface ToUcDetailEmits {
  (e: "update:modelValue", value: boolean): void;

  (e: "clickL"): void;

  (e: "clickR"): void;
}

type fixedLenArray<T, N extends number> = [T, ...T[]] & { length: N };
type relicsInfo = fixedLenArray<TGApp.Sqlite.Character.RoleReliquary | false, 5>;

interface ToUcDetailData {
  weapon: TGApp.Sqlite.Character.RoleWeapon;
  constellation: TGApp.Sqlite.Character.RoleConstellation[];
  reliquary: relicsInfo;
  costume: TGApp.Sqlite.Character.RoleCostume[];
  bg: string;
  bgFit: "contain" | "cover";
}

const emits = defineEmits<ToUcDetailEmits>();
const props = defineProps<ToUcDetailProps>();
const visible = computed({
  get: () => props.modelValue,
  set: (value) => {
    emits("update:modelValue", value);
  },
});
const showCostumeSwitch = ref(false);

// data
const data = ref<ToUcDetailData>({
  weapon: <TGApp.Sqlite.Character.RoleWeapon>{},
  constellation: [],
  reliquary: [false, false, false, false, false],
  costume: [],
  bg: "",
  bgFit: "contain",
});
const selectConstellation = ref<TGApp.Sqlite.Character.RoleConstellation>(
  <TGApp.Sqlite.Character.RoleConstellation>{},
);
const selectWeapon = ref<TGApp.Sqlite.Character.RoleWeapon>(<TGApp.Sqlite.Character.RoleWeapon>{});
const selectRelic = ref<TGApp.Sqlite.Character.RoleReliquary>(
  <TGApp.Sqlite.Character.RoleReliquary>{},
);
const selected = ref({
  type: "武器" || "命之座" || "圣遗物",
  pos: 0,
});

// 重置数据
function resetData(): void {
  data.value = {
    weapon: <TGApp.Sqlite.Character.RoleWeapon>{},
    constellation: [],
    reliquary: [false, false, false, false, false],
    costume: [],
    bg: "",
    bgFit: "contain",
  };
  selected.value = {
    type: "武器",
    pos: 0,
  };
}

// 加载数据
function loadData(): void {
  if (!props.modelValue) return;
  resetData();
  data.value.weapon = JSON.parse(props.dataVal.weapon);
  data.value.constellation = JSON.parse(props.dataVal.constellation);
  if (props.dataVal.reliquary !== "") {
    const relics = <TGApp.Sqlite.Character.RoleReliquary[]>JSON.parse(props.dataVal.reliquary);
    const relicTemp: relicsInfo = [false, false, false, false, false];
    relics.forEach((item) => {
      switch (item.pos) {
        case 1:
          relicTemp[0] = item;
          break;
        case 2:
          relicTemp[1] = item;
          break;
        case 3:
          relicTemp[2] = item;
          break;
        case 4:
          relicTemp[3] = item;
          break;
        case 5:
          relicTemp[4] = item;
          break;
        default:
          break;
      }
    });
    data.value.reliquary = relicTemp;
  }
  data.value.costume = JSON.parse(props.dataVal.costume);
  data.value.bg = props.dataVal.img;
  data.value.bgFit = "contain";
  showCostumeSwitch.value = false;
  selectWeapon.value = data.value.weapon;
}

onMounted(() => {
  loadData();
});

// 监听外部数据变化
onUpdated(() => {
  loadData();
});

const weaponBox = computed(() => {
  const weapon = data.value.weapon;
  return {
    icon: `/WIKI/weapon/icon/${weapon.id}.webp`,
    bg: `/icon/bg/${weapon.star}-Star.webp`,
  };
});

const onCancel = (): void => {
  visible.value = false;
  emits("update:modelValue", false);
};

function handleClick(pos: "left" | "right") {
  pos === "left" ? emits("clickL") : emits("clickR");
}

function showDetail(
  item:
    | TGApp.Sqlite.Character.RoleConstellation
    | TGApp.Sqlite.Character.RoleWeapon
    | TGApp.Sqlite.Character.RoleReliquary
    | false,
  selectType: "命座" | "武器" | "圣遗物",
  selectPos: number,
): void {
  if (!item) return;
  switch (selectType) {
    case "命座":
      selectConstellation.value = <TGApp.Sqlite.Character.RoleConstellation>item;
      break;
    case "武器":
      selectWeapon.value = <TGApp.Sqlite.Character.RoleWeapon>item;
      break;
    case "圣遗物":
      selectRelic.value = <TGApp.Sqlite.Character.RoleReliquary>item;
      break;
    default:
      break;
  }
  selected.value = {
    type: selectType,
    pos: selectPos,
  };
}

function switchBg(): void {
  if (!showCostumeSwitch.value) {
    data.value.bg = data.value.costume[0].icon;
    data.value.bgFit = "cover";
    showCostumeSwitch.value = true;
  } else {
    data.value.bg = props.dataVal.img;
    data.value.bgFit = "contain";
    showCostumeSwitch.value = false;
  }
}
</script>
<style lang="css" scoped>
.tuc-do-div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  column-gap: 10px;
}

.tuc-arrow-left,
.tuc-arrow-right {
  position: relative;
  display: flex;
  width: 30px;
  height: 30px;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.dark .tuc-arrow-left,
.dark .tuc-arrow-right {
  filter: invert(11%) sepia(73%) saturate(11%) hue-rotate(139deg) brightness(97%) contrast(81%);
}

.tuc-arrow-left img {
  width: 100%;
  height: 100%;
  transform: rotate(180deg);
}

.tuc-arrow-right img {
  width: 100%;
  height: 100%;
}

.tuc-do-box {
  position: relative;
  width: 500px;
  height: 620px;
  padding: 10px;
  border-radius: 5px;
  background: var(--box-bg-1);
}

.tuc-do-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 5px;
  margin: 0 auto;
}

.tuc-do-bg img {
  width: 100%;
  height: 100%;
  border-radius: 5px;
}

.tuc-do-quote {
  position: absolute;
  right: 0;
  bottom: 0;
  padding: 2px 5px;
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  background: var(--common-shadow-2);
  border-bottom-right-radius: 5px;
  border-top-left-radius: 5px;
  color: var(--tgc-white-1);
  font-size: 14px;
}

.tuc-do-costume {
  position: absolute;
  z-index: 1;
  top: 5px;
  right: 10px;
  color: var(--tgc-pink-1);
}

.tuc-do-costume-name {
  position: absolute;
  top: 10px;
  left: calc(50% - 80px);
  width: 160px;
  border-radius: 5px;
  -webkit-backdrop-filter: blur(5px);
  backdrop-filter: blur(5px);
  background: var(--tgc-white-1);
  color: var(--tgc-yellow-1);
  font-family: var(--font-text);
  font-size: 16px;
  opacity: 0.8;
  text-align: center;
}

.tuc-do-show {
  position: absolute;
  display: flex;
  width: calc(100% - 20px);
  flex-wrap: wrap;
  align-items: start;
  justify-content: space-around;
}

.tuc-do-left {
  position: relative;
  width: 50%;
  height: 400px;
}

.tuc-do-right {
  width: 50%;
  height: 400px;
}

.tuc-do-bottom {
  width: 480px;
  height: 140px;
}

/* 左侧显示区域 */
.tuc-dol-item {
  position: absolute;
  border-radius: 5px;
  cursor: pointer;
}

/* 排列武器跟5个圣遗物 */
.tuc-dol-item:nth-child(1) {
  top: 40px;
  left: 10px;
}

.tuc-dol-item:nth-child(2) {
  top: 90px;
  left: 80px;
}

.tuc-dol-item:nth-child(3) {
  top: 140px;
  left: 10px;
}

.tuc-dol-item:nth-child(4) {
  top: 190px;
  left: 80px;
}

.tuc-dol-item:nth-child(5) {
  top: 240px;
  left: 10px;
}

.tuc-dol-item:nth-child(6) {
  top: 290px;
  left: 80px;
}

/* 右侧显示区域 */

.tuc-dor-box {
  position: relative;
  width: 100%;
  height: 100%;
}

.tuc-dor-item {
  position: absolute;
  cursor: pointer;
}

/* 环状排列6个命座 */
.tuc-dor-item:nth-child(1) {
  top: 0;
  right: 100px;
}

.tuc-dor-item:nth-child(2) {
  top: 50px;
  right: 40px;
}

.tuc-dor-item:nth-child(3) {
  top: 130px;
  right: 10px;
}

.tuc-dor-item:nth-child(4) {
  right: 10px;
  bottom: 130px;
}

.tuc-dor-item:nth-child(5) {
  right: 40px;
  bottom: 50px;
}

.tuc-dor-item:nth-child(6) {
  right: 100px;
  bottom: 0;
}
</style>
