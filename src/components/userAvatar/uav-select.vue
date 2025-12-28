<!-- 角色筛选组件 -->
<template>
  <v-bottom-sheet v-model="visible">
    <div class="uav-select-container">
      <div class="uav-select-item">
        <div class="uav-select-title">星级</div>
        <div class="uav-select-props">
          <UavSelectChips
            :items="starOpts"
            :selected="model.star"
            size="small"
            @chipSelect="handleStarSelect"
          />
        </div>
      </div>
      <div class="uav-select-item">
        <div class="uav-select-title">武器</div>
        <div class="uav-select-props">
          <UavSelectChips
            :items="weaponOpts"
            :selected="model.weapon"
            size="small"
            @chipSelect="handleWeaponSelect"
          />
        </div>
      </div>
      <div class="uav-select-item">
        <div class="uav-select-title">元素</div>
        <div class="uav-select-props">
          <UavSelectChips
            :items="elementOpts"
            :selected="model.element"
            size="small"
            @chipSelect="handleElementSelect"
          />
        </div>
      </div>
      <div class="uav-select-item">
        <div class="uav-select-title">地区</div>
        <div class="uav-select-props">
          <UavSelectChips
            :items="areaOpts"
            :selected="model.area"
            size="small"
            @chipSelect="handleAreaSelect"
          />
        </div>
      </div>
      <div class="uav-select-acts">
        <v-btn class="uav-act-btn" prepend-icon="mdi-check" variant="elevated" @click="onConfirm()">
          确定
        </v-btn>
        <v-btn class="uav-act-btn" prepend-icon="mdi-cancel" variant="elevated" @click="onCancel()">
          取消
        </v-btn>
      </div>
    </div>
  </v-bottom-sheet>
</template>
<script lang="ts" setup>
import UavSelectChips, { type UavSelectChipsItem } from "@comp/userAvatar/uav-select-chips.vue";
import { ref } from "vue";

/** 返回数据 */
export type UavSelectModel = {
  /** 星级 */
  star: Array<string>;
  /** 武器 */
  weapon: Array<string>;
  /** 元素 */
  element: Array<string>;
  /** 地区 */
  area: Array<string>;
};

type UavSelectEmits = (e: "select", v: UavSelectModel) => void;

const starOpts: Array<UavSelectChipsItem> = [
  { label: "⭐⭐⭐⭐", value: "4", title: "四星" },
  { label: "⭐⭐⭐⭐⭐", value: "5", title: "五星" },
];
const weaponOpts: Array<UavSelectChipsItem> = ["单手剑", "双手剑", "弓", "法器", "长柄武器"].map(
  (i) => ({ label: i, value: i, title: i, icon: `/icon/weapon/${i}.webp` }),
);
const elementOpts: Array<UavSelectChipsItem> = ["冰", "岩", "水", "火", "草", "雷", "风"].map(
  (i) => ({ label: i, value: i, title: `${i}元素`, icon: `/icon/element/${i}元素.webp` }),
);
const areaOpts: Array<UavSelectChipsItem> = [
  "未知",
  "蒙德",
  "璃月",
  "主角",
  "愚人众",
  "稻妻",
  "游侠",
  "须弥",
  "枫丹",
  "纳塔",
  "至冬",
  "寰宇劫灭",
  "挪德卡莱",
].map((i) => ({ label: i, value: i, title: i }));

const emits = defineEmits<UavSelectEmits>();

const starSelected = ref<Array<string>>([]);
const weaponSelected = ref<Array<string>>([]);
const elementSelected = ref<Array<string>>([]);
const areaSelected = ref<Array<string>>([]);

const model = defineModel<UavSelectModel>({
  default: { star: [], weapon: [], area: [], element: [] },
});
const visible = defineModel<boolean>("show");

function onCancel(): void {
  visible.value = false;
}

async function onConfirm(): Promise<void> {
  model.value = {
    star: starSelected.value,
    weapon: weaponSelected.value,
    element: elementSelected.value,
    area: areaSelected.value,
  };
  // await nextTick();
  emits("select", model.value);
  visible.value = false;
}

function handleStarSelect(e: Array<string>): void {
  console.log("starSelect", e);
  starSelected.value = e;
}

function handleWeaponSelect(e: Array<string>): void {
  console.log("weaponSelect", e);
  weaponSelected.value = e;
}

function handleElementSelect(e: Array<string>): void {
  console.log("elementSelect", e);
  elementSelected.value = e;
}

function handleAreaSelect(e: Array<string>): void {
  console.log("areaSelect", e);
  areaSelected.value = e;
}
</script>
<style lang="scss" scoped>
.uav-select-container {
  position: absolute;
  z-index: 1;
  bottom: 0;
  left: 0;
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px;
  border-radius: 4px;
  background: var(--app-page-bg);
}

.uav-select-item {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: flex-start;
  color: var(--common-text-title);
  column-gap: 8px;
}

.uav-select-acts {
  position: relative;
  display: flex;
  align-items: center;
  margin-top: 8px;
  column-gap: 8px;
}

.uav-act-btn {
  background: var(--tgc-btn-1);
  color: var(--btn-text);
  font-family: var(--font-text);
}
</style>
