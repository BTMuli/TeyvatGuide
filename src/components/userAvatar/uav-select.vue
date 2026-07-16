<!-- 角色筛选组件 -->
<template>
  <v-bottom-sheet v-model="visible">
    <div class="uav-select-container">
      <div class="uav-select-main">
        <div class="uav-select-left">
          <div class="uav-select-item">
            <div class="uav-select-title">衣装</div>
            <div class="uav-select-props">
              <UavSelectChips
                v-model:selected="costumeSelected"
                :items="costumeOpts"
                size="small"
              />
            </div>
          </div>
          <div class="uav-select-item">
            <div class="uav-select-title">好感</div>
            <div class="uav-select-props">
              <UavSelectChips v-model:selected="fetterSelected" :items="fetterOpts" size="small" />
            </div>
          </div>
          <div class="uav-select-item">
            <div class="uav-select-title">星级</div>
            <div class="uav-select-props">
              <UavSelectChips v-model:selected="starSelected" :items="starOpts" size="small" />
            </div>
          </div>
          <div class="uav-select-item">
            <div class="uav-select-title">等级</div>
            <div class="uav-select-props">
              <UavSelectChips v-model:selected="levelSelected" :items="levelOpts" size="small" />
            </div>
          </div>
        </div>
        <div class="uav-select-right">
          <div class="uav-select-item">
            <div class="uav-select-title">武器</div>
            <div class="uav-select-props weapon">
              <UavSelectChips v-model:selected="weaponSelected" :items="weaponOpts" size="small" />
            </div>
          </div>
          <div class="uav-select-item">
            <div class="uav-select-title">元素</div>
            <div class="uav-select-props">
              <UavSelectChips
                v-model:selected="elementSelected"
                :items="elementOpts"
                size="small"
              />
            </div>
          </div>
          <div class="uav-select-item">
            <div class="uav-select-title">强化</div>
            <div class="uav-select-props">
              <UavSelectChips v-model:selected="teamSelected" :items="teamOpts" size="small" />
            </div>
          </div>
          <div class="uav-select-item">
            <div class="uav-select-title">阵营</div>
            <div class="uav-select-props">
              <UavSelectChips v-model:selected="areaSelected" :items="areaOpts" size="small" />
            </div>
          </div>
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
import { ref, watch } from "vue";

/** 返回数据 */
export type UavSelectModel = {
  /** 皮肤 */
  costume: Array<string>;
  /** 满好感 */
  fetter: Array<string>;
  /** 星级 */
  star: Array<string>;
  /** 等级 */
  level: Array<string>;
  /** 武器 */
  weapon: Array<string>;
  /** 元素 */
  element: Array<string>;
  /** 强化 */
  team: Array<string>;
  /** 地区 */
  area: Array<string>;
};

type UavSelectEmits = (e: "select", v: UavSelectModel) => void;

const costumeOpts: Array<UavSelectChipsItem> = [
  { label: "有", value: "true", title: "有衣装" },
  { label: "无", value: "false", title: "无衣装" },
];
const fetterOpts: Array<UavSelectChipsItem> = [
  { label: "已满", value: "true", title: "满好感" },
  { label: "未满", value: "false", title: "好感未满" },
];
const starOpts: Array<UavSelectChipsItem> = [
  { label: "⭐⭐⭐⭐", value: "4", title: "四星" },
  { label: "⭐⭐⭐⭐⭐", value: "5", title: "五星" },
];
const levelOpts: Array<UavSelectChipsItem> = [
  { label: "≥70", value: "true", title: "不低于70级" },
  { label: "<70", value: "false", title: "低于70级" },
];
const weaponOpts: Array<UavSelectChipsItem> = ["单手剑", "双手剑", "弓", "法器", "长柄武器"].map(
  (i) => ({ label: i, value: i, title: i, icon: `/icon/weapon/${i}.webp` }),
);
const elementOpts: Array<UavSelectChipsItem> = ["冰", "岩", "水", "火", "草", "雷", "风"].map(
  (i) => ({ label: i, value: i, title: `${i}元素`, icon: `/icon/element/${i}元素.webp` }),
);
const teamOpts: Array<UavSelectChipsItem> = [
  { label: "无", value: "0", title: "无" },
  { label: "魔导", value: "1", title: "魔导" },
  { label: "月兆", value: "2", title: "月兆" },
];
const areaOpts: Array<UavSelectChipsItem> = [
  "蒙德",
  "璃月",
  "稻妻",
  "须弥",
  "枫丹",
  "纳塔",
  "至冬",
  "挪德卡莱",
  "愚人众",
  "魔女会",
  "其他",
].map((i) => ({ label: i, value: i, title: i }));

const emits = defineEmits<UavSelectEmits>();

const costumeSelected = ref<Array<string>>([]);
const fetterSelected = ref<Array<string>>([]);
const starSelected = ref<Array<string>>([]);
const levelSelected = ref<Array<string>>([]);
const weaponSelected = ref<Array<string>>([]);
const elementSelected = ref<Array<string>>([]);
const teamSelected = ref<Array<string>>([]);
const areaSelected = ref<Array<string>>([]);

const model = defineModel<UavSelectModel>({
  default: { costume: [], fetter: [], star: [], weapon: [], element: [], team: [], area: [] },
});
const visible = defineModel<boolean>("show");

watch(
  () => visible.value,
  () => {
    if (visible.value) {
      costumeSelected.value = model.value.costume;
      fetterSelected.value = model.value.fetter;
      starSelected.value = model.value.star;
      levelSelected.value = model.value.level;
      weaponSelected.value = model.value.weapon;
      elementSelected.value = model.value.element;
      teamSelected.value = model.value.team;
      areaSelected.value = model.value.area;
    }
  },
);

function onCancel(): void {
  visible.value = false;
}

function onConfirm(): void {
  model.value = {
    costume: costumeSelected.value,
    fetter: fetterSelected.value,
    star: starSelected.value,
    level: levelSelected.value,
    weapon: weaponSelected.value,
    element: elementSelected.value,
    team: teamSelected.value,
    area: areaSelected.value,
  };
  emits("select", model.value);
  visible.value = false;
}
</script>
<style lang="scss" scoped>
@use "@styles/github.styles.scss" as github-styles;

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
  padding: 8px 16px;
  backdrop-filter: blur(4px);
  background: #00000066;
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
  box-shadow: 0 -4px 8px var(--common-shadow-2);

  --webkit-backdrop-filter: blur(4px);
}

.uav-select-main {
  position: relative;
  display: flex;
  width: 100%;
  align-items: flex-start;
  justify-content: flex-start;
  column-gap: 24px;
}

.uav-select-left {
  width: 360px;
}

.uav-select-left,
.uav-select-right {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.uav-select-item {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: flex-start;
  column-gap: 8px;
}

.uav-select-title {
  color: var(--tgc-white-1);
  text-shadow: 0 0 4px var(--common-shadow-2);
  white-space: nowrap;
}

.uav-select-acts {
  position: relative;
  display: flex;
  align-items: center;
  margin-top: 8px;
  column-gap: 12px;
}

.uav-act-btn {
  @include github-styles.github-tag-dark-gen(#41b883);

  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
  box-shadow: 1px 1px 4px var(--common-shadow-4);
  font-family: var(--font-text);
}

.uav-act-btn:last-child {
  @include github-styles.github-tag-dark-gen(#fb7299);
}
</style>
