<!-- 角色筛选组件 -->
<template>
  <TwfFilterShell
    v-model="visible"
    description="按角色养成与属性组合筛选，可同时选择多个条件"
    title="筛选角色"
    topOffset="112px"
    @confirm="onConfirm"
  >
    <div class="twf-grid twf-grid-3 uav-select-primary-grid">
      <section class="twf-group">
        <div class="twf-group-title">星级</div>
        <div class="twf-options">
          <UavSelectChips v-model:selected="starSelected" :items="starOpts" size="small">
            <template #all>全选</template>
          </UavSelectChips>
        </div>
      </section>
      <section class="twf-group">
        <div class="twf-group-title">衣装</div>
        <div class="twf-options">
          <UavSelectChips v-model:selected="costumeSelected" :items="costumeOpts" size="small">
            <template #all>全选</template>
          </UavSelectChips>
        </div>
      </section>
      <section class="twf-group">
        <div class="twf-group-title">好感</div>
        <div class="twf-options">
          <UavSelectChips v-model:selected="fetterSelected" :items="fetterOpts" size="small">
            <template #all>全选</template>
          </UavSelectChips>
        </div>
      </section>
      <div class="twf-grid twf-grid-3 twf-group-wide">
        <section class="twf-group">
          <div class="twf-group-title">命座</div>
          <div class="twf-options">
            <UavSelectChips
              v-model:selected="constellationSelected"
              :items="constellationOpts"
              size="small"
            >
              <template #all>全选</template>
            </UavSelectChips>
          </div>
        </section>
        <section class="twf-group">
          <div class="twf-group-title">等级</div>
          <div class="twf-options">
            <UavSelectChips v-model:selected="levelSelected" :items="levelOpts" size="small">
              <template #all>全选</template>
            </UavSelectChips>
          </div>
        </section>
        <section class="twf-group">
          <div class="twf-group-title">特殊强化</div>
          <div class="twf-options">
            <UavSelectChips v-model:selected="teamSelected" :items="teamOpts" size="small">
              <template #all>全选</template>
            </UavSelectChips>
          </div>
        </section>
      </div>
      <div class="twf-grid twf-group-wide">
        <section class="twf-group twf-group-weapon">
          <div class="twf-group-title">武器类型</div>
          <div class="twf-options">
            <UavSelectChips v-model:selected="weaponSelected" :items="weaponOpts" size="small">
              <template #all>全选</template>
            </UavSelectChips>
          </div>
        </section>
        <section class="twf-group">
          <div class="twf-group-title">元素</div>
          <div class="twf-options">
            <UavSelectChips v-model:selected="elementSelected" :items="elementOpts" size="small">
              <template #all>全选</template>
            </UavSelectChips>
          </div>
        </section>
      </div>
      <section class="twf-group twf-group-wide">
        <div class="twf-group-title">所属地区或阵营</div>
        <div class="twf-options">
          <UavSelectChips v-model:selected="areaSelected" :items="areaOpts" size="small">
            <template #all>全选</template>
          </UavSelectChips>
        </div>
      </section>
    </div>
  </TwfFilterShell>
</template>
<script lang="ts" setup>
import TwfFilterShell from "@comp/pageWiki/twf-filter-shell.vue";
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
  /** 命座 */
  constellation: Array<string>;
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

type UavSelectEmits = { select: [v: UavSelectModel] };

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
const constellationOpts: Array<UavSelectChipsItem> = Array.from({ length: 7 }, (_, index) => ({
  label: `${index}命`,
  value: index.toString(),
  title: `${index}命`,
}));
const levelOpts: Array<UavSelectChipsItem> = [
  { label: "≥70", value: "true", title: "不低于70级" },
  { label: "<70", value: "false", title: "低于70级" },
  { label: "95", value: "95", title: "95级" },
  { label: "100", value: "100", title: "100级" },
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
const constellationSelected = ref<Array<string>>([]);
const levelSelected = ref<Array<string>>([]);
const weaponSelected = ref<Array<string>>([]);
const elementSelected = ref<Array<string>>([]);
const teamSelected = ref<Array<string>>([]);
const areaSelected = ref<Array<string>>([]);

const model = defineModel<UavSelectModel>({
  default: () => ({
    costume: [],
    fetter: [],
    star: [],
    constellation: [],
    level: [],
    weapon: [],
    element: [],
    team: [],
    area: [],
  }),
});
const visible = defineModel<boolean>("show");

watch(
  () => visible.value,
  () => {
    if (visible.value) {
      costumeSelected.value = [...model.value.costume];
      fetterSelected.value = [...model.value.fetter];
      starSelected.value = [...model.value.star];
      constellationSelected.value = [...model.value.constellation];
      levelSelected.value = [...model.value.level];
      weaponSelected.value = [...model.value.weapon];
      elementSelected.value = [...model.value.element];
      teamSelected.value = [...model.value.team];
      areaSelected.value = [...model.value.area];
    }
  },
);

function onConfirm(): void {
  emits("select", {
    costume: [...costumeSelected.value],
    fetter: [...fetterSelected.value],
    star: [...starSelected.value],
    constellation: [...constellationSelected.value],
    level: [...levelSelected.value],
    weapon: [...weaponSelected.value],
    element: [...elementSelected.value],
    team: [...teamSelected.value],
    area: [...areaSelected.value],
  });
  visible.value = false;
}
</script>
<style lang="scss" scoped>
.twf-grid.twf-grid-3.uav-select-primary-grid {
  grid-template-columns: minmax(0, 1fr) repeat(2, max-content);
}
</style>
