<template>
  <TOverlay v-model="visible" hide :to-click="onCancel" blur-val="20px">
    <div class="tuc-do-box">
      <div class="tuc-do-bg">
        <img :src="data.bg" alt="role" />
      </div>
      <div class="tuc-do-quote">* 所有数据以游戏内为准，此处仅供参考</div>
      <!-- 衣装 -->
      <div v-if="data.costume.length > 0" class="tuc-do-costume">
        <v-switch v-model="showCostumeSwitch" color="#faf7e8" @click="switchBg">
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
              border: selected.pos === 0 ? '2px solid var(--common-color-yellow)' : '',
            }"
            @click="showDetail(data.weapon, '武器', 0)"
          >
            <TucDetailItemBox v-model="weaponBox" />
          </div>
          <div
            v-for="(item, index) in data.reliquary"
            class="tuc-dol-item"
            :style="{
              cursor: item ? 'pointer' : 'default',
              border: selected.pos === index + 1 ? '2px solid var(--common-color-yellow)' : '',
            }"
            @click="showDetail(item, '圣遗物', index + 1)"
          >
            <TucDetailRelic :model-value="item" :pos="index.toString()" />
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
                border: selected.pos === item.pos + 5 ? '2px solid var(--common-color-yellow)' : '',
              }"
              @click="showDetail(item, '命座', item.pos + 5)"
            />
          </div>
        </div>
        <!-- 底部说明 -->
        <div class="tuc-do-bottom">
          <TucDetailDescWeapon
            v-if="selected.type === '武器'"
            v-model="selected.data as TGApp.Sqlite.Character.RoleWeapon"
          />
          <TucDetailDescConstellation
            v-else-if="selected.type === '命座'"
            v-model="selected.data as TGApp.Sqlite.Character.RoleConstellation"
          />
          <TucDetailDescRelic
            v-else-if="selected.type === '圣遗物'"
            v-model="selected.data as TGApp.Sqlite.Character.RoleReliquary"
          />
        </div>
      </div>
    </div>
  </TOverlay>
</template>
<script lang="ts" setup>
// vue
import { computed, onMounted, onUpdated, ref } from "vue";
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
const showCostumeSwitch = ref(false);

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
  costume: [] as TGApp.Sqlite.Character.RoleCostume[],
  bg: "" as string,
});
const selected = ref({
  data: {} as
    | TGApp.Sqlite.Character.RoleConstellation
    | TGApp.Sqlite.Character.RoleWeapon
    | TGApp.Sqlite.Character.RoleReliquary,
  type: "武器" || "命之座" || "圣遗物",
  pos: 0, // 用于标记选中的是哪个位置
});

// 加载数据
function loadData() {
  if (!props.modelValue) return;
  data.value.weapon = JSON.parse(props.dataVal.weapon) as TGApp.Sqlite.Character.RoleWeapon;
  data.value.constellation = JSON.parse(
    props.dataVal.constellation,
  ) as TGApp.Sqlite.Character.RoleConstellation[];
  if (props.dataVal.reliquary !== "") {
    const relics = JSON.parse(props.dataVal.reliquary) as TGApp.Sqlite.Character.RoleReliquary[];
    relics.map((item) => {
      data.value.reliquary[item.pos] = item;
    });
  }
  data.value.costume = JSON.parse(props.dataVal.costume) as TGApp.Sqlite.Character.RoleCostume[];
  data.value.bg = props.dataVal.img;
  showCostumeSwitch.value = false;
  selected.value = {
    data: data.value.weapon,
    type: "武器",
    pos: 0,
  };
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

const onCancel = () => {
  visible.value = false;
  emits("cancel");
};

function showDetail(
  item:
    | TGApp.Sqlite.Character.RoleConstellation
    | TGApp.Sqlite.Character.RoleWeapon
    | TGApp.Sqlite.Character.RoleReliquary
    | false,
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

function switchBg() {
  if (data.value.bg === props.dataVal.img) {
    data.value.bg = data.value.costume[0].icon;
  } else {
    data.value.bg = props.dataVal.img;
  }
}
</script>
<style lang="css" scoped>
.tuc-do-box {
  position: relative;
  width: 500px;
  height: 620px;
  padding: 10px;
  border-radius: 5px;
  background: rgb(255 255 255 / 30%);
}

.tuc-do-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  margin: 0 auto;
}

.tuc-do-bg img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.tuc-do-quote {
  position: absolute;
  right: 10px;
  bottom: 5px;
  color: var(--common-color-grey-2);
  font-family: var(--font-text);
  font-size: 12px;
}

.tuc-do-costume {
  position: absolute;
  z-index: 1;
  top: 5px;
  right: 10px;
}

.tuc-do-costume-name {
  position: absolute;
  top: 5px;
  left: 0;
  width: 100%;
  color: var(--common-color-white);
  font-family: var(--font-text);
  font-size: 16px;
  text-align: center;
  text-shadow: 0 0 10px var(--common-color-yellow);
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
