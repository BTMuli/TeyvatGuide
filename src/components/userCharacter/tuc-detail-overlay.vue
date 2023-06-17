<template>
  <TOverlay v-model="visible" hide :to-click="onCancel">
    <div class="tuc-do-box">
      <div class="tuc-do-bg">
        <img :src="props.dataVal.img" alt="role">
      </div>
      <div class="tuc-do-quote">
        * 所有数据以游戏内为准，此处仅供参考
      </div>
      <div v-if="data" class="tuc-do-show">
        <!-- 左侧武器跟圣遗物 -->
        <div class="tuc-do-left">
          <div
            class="tuc-dol-item"
            :style="{
              border: selected.pos === 0 ? '2px solid var(--common-color-yellow)' : '',
            }"
            @click="showDetail(data.weapon,'武器',0)"
          >
            <TucDetailItemBox v-model="weaponBox" />
          </div>
          <div
            class="tuc-dol-item"
            :style="{
              cursor: data.reliquary[1] ? 'pointer' : 'default',
              border: selected.pos === 1 ? '2px solid var(--common-color-yellow)' : '',
            }"
            @click="showDetail(data.reliquary[1],'圣遗物',1)"
          >
            <TucDetailRelic v-model="data.reliquary[1]" pos="1" />
          </div>
          <div
            class="tuc-dol-item"
            :style="{
              cursor: data.reliquary[2] ? 'pointer' : 'default',
              border: selected.pos === 2 ? '2px solid var(--common-color-yellow)' : '',
            }"
            @click="showDetail(data.reliquary[2],'圣遗物',2)"
          >
            <TucDetailRelic v-model="data.reliquary[2]" pos="2" />
          </div>
          <div
            class="tuc-dol-item"
            :style="{
              cursor: data.reliquary[3] ? 'pointer' : 'default',
              border: selected.pos === 3 ? '2px solid var(--common-color-yellow)' : '',
            }"
            @click="showDetail(data.reliquary[3],'圣遗物',3)"
          >
            <TucDetailRelic v-model="data.reliquary[3]" pos="3" />
          </div>
          <div
            class="tuc-dol-item"
            :style="{
              cursor: data.reliquary[4] ? 'pointer' : 'default',
              border: selected.pos === 4 ? '2px solid var(--common-color-yellow)' : '',
            }"
            @click="showDetail(data.reliquary[4],'圣遗物',4)"
          >
            <TucDetailRelic v-model="data.reliquary[4]" pos="4" />
          </div>
          <div
            class="tuc-dol-item"
            :style="{
              cursor: data.reliquary[5] ? 'pointer' : 'default',
              border: selected.pos === 5 ? '2px solid var(--common-color-yellow)' : '',
            }"
            @click="showDetail(data.reliquary[5],'圣遗物',5)"
          >
            <TucDetailRelic v-model="data.reliquary[5]" pos="5" />
          </div>
        </div>
        <!-- 右侧环状排列6个命座 -->
        <div class="tuc-do-right">
          <div class="tuc-dor-box">
            <TucDetailConstellation
              v-for="item in data.constellation"
              class="tuc-dor-item"
              :model-value="item"
              :style="{
                border: selected.pos === item.pos+5 ? '2px solid var(--common-color-yellow)' : '',
              }"
              @click="showDetail(item, '命座', item.pos+5)"
            />
          </div>
        </div>
        <!-- 底部说明 -->
        <div class="tuc-do-bottom">
          <TucDetailDescWeapon v-if="selected.type === '武器'" v-model="selected.data" />
          <TucDetailDescConstellation v-else-if="selected.type === '命座'" v-model="selected.data" />
          <TucDetailDescRelic v-else-if="selected.type === '圣遗物'" v-model="selected.data" />
        </div>
      </div>
    </div>
  </TOverlay>
</template>
<script lang="ts" setup>
// vue
import { computed, onMounted, ref } from "vue";
import TOverlay from "../main/t-overlay.vue";
import TucDetailDescWeapon from "./tuc-detail-desc-weapon.vue";
import TucDetailDescConstellation from "./tuc-detail-desc-constellation.vue";
import TucDetailDescRelic from "./tuc-detail-desc-relic.vue";
import TucDetailItemBox from "./tuc-detail-itembox.vue";
import TucDetailConstellation from "./tuc-detail-constellation.vue";
import TucDetailRelic from "./tuc-detail-relic.vue";

interface ToUcDetailProps {
  modelValue: boolean;
  dataVal: TGApp.Sqlite.Character.UserRole;
}

interface ToUcDetailEmits {
  (e: "update:modelValue", value: TGApp.Sqlite.Character.UserRole): void;

  (e: "cancel"): void;
}

const emits = defineEmits<ToUcDetailEmits>();
const props = withDefaults(defineProps<ToUcDetailProps>(), {
  modelValue: false,
  dataVal: {} as TGApp.Sqlite.Character.UserRole,
});
const visible = computed({
  get: () => props.modelValue,
  set: (value) => emits("update:modelValue", value),
});

// data
const data = ref({
  weapon: {} as TGApp.Sqlite.Character.RoleWeapon,
  constellation: [] as TGApp.Sqlite.Character.RoleConstellation[],
  reliquary: {
    1: false as TGApp.Sqlite.Character.RoleReliquary | false,
    2: false as TGApp.Sqlite.Character.RoleReliquary | false,
    3: false as TGApp.Sqlite.Character.RoleReliquary | false,
    4: false as TGApp.Sqlite.Character.RoleReliquary | false,
    5: false as TGApp.Sqlite.Character.RoleReliquary | false,
  },
});
const selected = ref({
  data: {} as TGApp.Sqlite.Character.RoleConstellation
  | TGApp.Sqlite.Character.RoleWeapon
  | TGApp.Sqlite.Character.RoleReliquary,
  type: "武器" || "命之座" || "圣遗物",
  pos: 0, // 用于标记选中的是哪个位置
});

onMounted(() => {
  data.value.weapon = JSON.parse(props.dataVal.weapon) as TGApp.Sqlite.Character.RoleWeapon;
  data.value.constellation = JSON.parse(props.dataVal.constellation) as TGApp.Sqlite.Character.RoleConstellation[];
  if (props.dataVal.reliquary !== "") {
    const relics = JSON.parse(props.dataVal.reliquary) as TGApp.Sqlite.Character.RoleReliquary[];
    relics.map((item) => {
      data.value.reliquary[item.pos] = item;
    });
  }
  selected.value = {
    data: data.value.weapon,
    type: "武器",
    pos: 0,
  };
});

const weaponBox = computed(() => {
  const weapon = data.value.weapon;
  return {
    icon: `/WIKI/weapon/icon/${weapon.id}.webp`,
    bg: `/icon/bg/${weapon.star}-Star.webp`,
  };
});

const onCancel = () => {
  visible.value = false;
  emits("cancel");
};

function showDetail (
  item:
  TGApp.Sqlite.Character.RoleConstellation |
  TGApp.Sqlite.Character.RoleWeapon |
  TGApp.Sqlite.Character.RoleReliquary |
  false,
  type: string,
  pos: number = 0,
) {
  if (!item) return;
  selected.value = {
    data: item,
    type,
    pos,
  };
}
</script>
<style lang="css" scoped>
.tuc-do-box {
  position: relative;
  width: 500px;
  height: 620px;
  background: rgb(255 255 255 / 30%);
  border-radius: 5px;
  padding: 10px;
}

.tuc-do-bg {
  position: absolute;
  top: 0;
  left: 0;
  margin: 0 auto;
  width: 100%;
  height: 100%;
}

.tuc-do-bg img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.tuc-do-quote {
  position: absolute;
  bottom: 5px;
  right: 10px;
  font-family: var(--font-text);
  font-size: 12px;
  color: var(--common-color-grey-2);
}

.tuc-do-show {
  position: absolute;
  width: calc(100% - 20px);
  display: flex;
  flex-wrap: wrap;
  justify-content: space-around;
  align-items: start;
}

.tuc-do-left {
  width: 50%;
  height: 400px;
  position: relative;
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
  cursor: pointer;
  border-radius: 5px;
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
  width: 100%;
  height: 100%;
  position: relative;
}

.tuc-dor-item {
  position: absolute;
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
  bottom: 130px;
  right: 10px;
}

.tuc-dor-item:nth-child(5) {
  bottom: 50px;
  right: 40px;
}

.tuc-dor-item:nth-child(6) {
  bottom: 0;
  right: 100px;
}
</style>
