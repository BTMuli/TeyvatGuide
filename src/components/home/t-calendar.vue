<template>
  <THomeCard append>
    <template #title>今日素材 {{ dateNow }}</template>
    <template #title-append>
      <v-switch
        class="tc-switch"
        @change="switchType = switchType === 'avatar' ? 'weapon' : 'avatar'"
      />
      {{ switchType === "avatar" ? "角色" : "武器" }}
    </template>
    <template #default>
      <div class="tc-top">
        <div class="tc-btns">
          <v-btn
            v-for="text of btnText"
            :key="text.week"
            rounded
            :style="{
              border: text.week === weekNow ? '1px solid var(--tgc-yellow-1)' : 'none',
              backgroundColor:
                text.week === btnNow
                  ? 'var(--tgc-yellow-1)'
                  : text.week === weekNow
                    ? 'transparent'
                    : 'var(--tgc-btn-1)',
              color:
                text.week === btnNow
                  ? 'var(--box-text-4)'
                  : text.week === weekNow
                    ? 'var(--tgc-yellow-1)'
                    : 'var(--btn-text)',
            }"
            @click="getContents(text.week)"
            >{{ text.text }}
          </v-btn>
        </div>
        <v-pagination class="tc-page" v-model="page" :total-visible="visible" :length="length" />
      </div>
      <div class="tc-content">
        <TCalendarBirth />
        <div class="calendar-grid">
          <div v-for="item in renderItems" :key="item.id" @click="selectItem(item)">
            <TibCalendarItem
              :data="<TGApp.App.Calendar.Item>item"
              :model="switchType"
              :clickable="true"
            />
          </div>
        </div>
      </div>
    </template>
  </THomeCard>
  <ToCalendar v-model="showItem" :data-type="selectedType" :data-val="selectedItem" />
</template>
<script lang="ts" setup>
import { onMounted, ref, watch } from "vue";

import { AppCalendarData } from "../../data/index.js";
import TibCalendarItem from "../itembox/tib-calendar-item.vue";
import ToCalendar from "../overlay/to-calendar.vue";

import TCalendarBirth from "./t-calendar-birth.vue";
import THomeCard from "./t-homecard.vue";

const weekNow = ref<number>(0);
const btnNow = ref<number>(0);
const dateNow = ref<string>("");

// page
const page = ref<number>(1);
const length = ref<number>(0);
const visible = 16;

// calendar
const calendarNow = ref<TGApp.App.Calendar.Item[]>([]);
const characterCards = ref<TGApp.App.Calendar.Item[]>([]);
const weaponCards = ref<TGApp.App.Calendar.Item[]>([]);

// calendar item
const showItem = ref<boolean>(false);
const switchType = ref<"avatar" | "weapon">("avatar");
const selectedItem = ref<TGApp.App.Calendar.Item>(<TGApp.App.Calendar.Item>{});
const selectedType = ref<"avatar" | "weapon">("avatar");
const renderItems = ref<TGApp.App.Calendar.Item[]>([]);

const btnText = [
  {
    week: 7,
    text: "周日",
  },
  {
    week: 1,
    text: "周一",
  },
  {
    week: 2,
    text: "周二",
  },
  {
    week: 3,
    text: "周三",
  },
  {
    week: 4,
    text: "周四",
  },
  {
    week: 5,
    text: "周五",
  },
  {
    week: 6,
    text: "周六",
  },
];

interface TCalendarEmits {
  (e: "success"): void;
}

const emits = defineEmits<TCalendarEmits>();

onMounted(async () => {
  const dayNow = new Date().getDay() === 0 ? 7 : new Date().getDay();
  const week = <{ week: number; text: string }>btnText.find((item) => item.week === dayNow);
  dateNow.value =
    new Date()
      .toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
      .replace(/\//g, "-") + ` ${week.text}`;
  weekNow.value = dayNow;
  btnNow.value = dayNow;
  calendarNow.value = getCalendar(dayNow);
  characterCards.value = calendarNow.value.filter((item) => item.itemType === "character");
  weaponCards.value = calendarNow.value.filter((item) => item.itemType === "weapon");
  renderItems.value = getGrid();
  emits("success");
});

watch(
  () => page.value,
  () => {
    renderItems.value = getGrid();
  },
);

watch(
  () => switchType.value,
  () => {
    if (page.value !== 1) {
      page.value = 1;
    } else {
      renderItems.value = getGrid();
    }
  },
);

// 获取当前日历
function getCalendar(day: number): TGApp.App.Calendar.Item[] {
  return AppCalendarData.filter((item) => item.dropDays.includes(day));
}

function getGrid(): TGApp.App.Calendar.Item[] {
  let selectedCards: TGApp.App.Calendar.Item[];
  if (switchType.value === "avatar") {
    selectedCards = characterCards.value;
  } else {
    selectedCards = weaponCards.value;
  }
  length.value = Math.ceil(selectedCards.length / visible);
  return selectedCards.slice((page.value - 1) * visible, page.value * visible);
}

function selectItem(item: TGApp.App.Calendar.Item): void {
  selectedItem.value = item;
  selectedType.value = switchType.value;
  showItem.value = true;
}

function getContents(day: number): void {
  btnNow.value = day;
  calendarNow.value = getCalendar(day);
  characterCards.value = calendarNow.value.filter((item) => item.itemType === "character");
  weaponCards.value = calendarNow.value.filter((item) => item.itemType === "weapon");
  if (page.value !== 1) {
    page.value = 1;
  } else {
    renderItems.value = getGrid();
  }
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

.tc-btns {
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 5px;
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
