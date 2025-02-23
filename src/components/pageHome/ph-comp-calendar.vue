<template>
  <THomeCard append>
    <template #title>今日素材 {{ dateNow }}</template>
    <template #title-append>
      <v-switch class="tc-switch" @change="switchType()" />
      <span>{{ selectedType === "character" ? "角色" : "武器" }}</span>
    </template>
    <template #default>
      <div class="tc-top">
        <div class="tc-btn-list">
          <v-btn
            v-for="text of btnText"
            :key="text.week"
            rounded
            class="tc-btn"
            :class="{ selected: text.week === btnNow, today: text.week === weekNow }"
            @click="btnNow = text.week"
          >
            {{ text.text }}
          </v-btn>
        </div>
        <v-pagination class="tc-page" v-model="page" :total-visible="9" :length="length" />
      </div>
      <div class="tc-content">
        <TCalendarBirth />
        <div class="calendar-grid">
          <TItemBox
            v-for="item in renderItems"
            :key="item.id"
            @click="selectItem(item)"
            :model-value="getBoxData(item)"
          />
        </div>
      </div>
    </template>
  </THomeCard>
  <ToCalendar v-model="showItem" :data-type="selectedType" :data-val="selectedItem" />
</template>
<script lang="ts" setup>
import TItemBox, { type TItemBoxData } from "@comp/app/t-itemBox.vue";
import { computed, onMounted, ref, shallowRef } from "vue";

import TCalendarBirth from "./ph-calendar-birth.vue";
import ToCalendar from "./ph-calendar-overlay.vue";
import THomeCard from "./ph-comp-card.vue";

import { AppCalendarData } from "@/data/index.js";
import { timestampToDate } from "@/utils/toolFunc.js";

type BtnItem = { week: 1 | 2 | 3 | 4 | 5 | 6 | 7; text: string };
type TCalendarEmits = (e: "success") => void;
const btnText: Array<BtnItem> = [
  { week: 7, text: "周日" },
  { week: 1, text: "周一" },
  { week: 2, text: "周二" },
  { week: 3, text: "周三" },
  { week: 4, text: "周四" },
  { week: 5, text: "周五" },
  { week: 6, text: "周六" },
];
const emits = defineEmits<TCalendarEmits>();
const visible = 16;

const weekNow = ref<number>(0);
const btnNow = ref<number>(0);
const dateNow = ref<string>("");
const page = ref<number>(1);
const showItem = ref<boolean>(false);
const selectedType = ref<"character" | "weapon">("character");
const calendarTotal = computed<Array<TGApp.App.Calendar.Item>>(() =>
  AppCalendarData.filter(
    (i) => i.dropDays.includes(btnNow.value) && i.itemType === selectedType.value,
  ),
);
const length = computed<number>(() => Math.ceil(calendarTotal.value.length / visible));
const renderItems = computed<Array<TGApp.App.Calendar.Item>>(() =>
  calendarTotal.value.slice((page.value - 1) * visible, page.value * visible),
);
const selectedItem = shallowRef<TGApp.App.Calendar.Item>(renderItems.value[0]);

onMounted(() => {
  const dayNow = new Date().getDay() === 0 ? 7 : new Date().getDay();
  const week = btnText.find((item) => item.week === dayNow) ?? { text: "周日", week: 7 };
  dateNow.value = `${timestampToDate(new Date().getTime()).split(" ")[0]} ${week.text}`;
  weekNow.value = dayNow;
  btnNow.value = dayNow;
  emits("success");
});

function switchType(): void {
  selectedType.value = selectedType.value === "character" ? "weapon" : "character";
  page.value = 1;
}

function selectItem(item: TGApp.App.Calendar.Item): void {
  selectedItem.value = item;
  showItem.value = true;
}

function getBoxData(item: TGApp.App.Calendar.Item): TItemBoxData {
  return {
    bg: `/icon/bg/${item.star}-Star.webp`,
    icon: `/WIKI/${item.itemType}/${item.id}.webp`,
    size: "100px",
    height: "100px",
    display: "inner",
    clickable: true,
    lt: item.element
      ? `/icon/element/${item.element}元素.webp`
      : `/icon/weapon/${item.weapon}.webp`,
    ltSize: "20px",
    innerHeight: 25,
    innerIcon: item.element ? `/icon/weapon/${item.weapon}.webp` : undefined,
    innerText: item.name,
  };
}
</script>
<style lang="css" scoped>
.tc-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  font-family: var(--font-title);
  font-size: 20px;
}

.tc-switch {
  display: flex;
  height: 36px;
  align-items: center;
  justify-content: center;
  margin-right: 5px;
}

.tc-btn-list {
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 5px;
}

.tc-btn {
  background: var(--tgc-btn-1);
  color: var(--btn-text);

  &.today {
    border: 1px solid var(--tgc-yellow-1);
  }

  &.selected {
    background-color: var(--tgc-yellow-1);
    color: var(--box-text-4);
  }

  &.today:not(.selected) {
    background-color: transparent;
    color: var(--tgc-yellow-1);
  }
}

.tc-content {
  position: relative;
  display: flex;
  height: 210px;
  align-items: center;
  justify-content: space-between;
  column-gap: 10px;
}

.calendar-grid {
  display: grid;
  height: 100%;
  grid-gap: 10px;
  grid-template-columns: repeat(8, 100px);
  place-items: flex-start flex-start;
}
</style>
