<template>
  <div class="calendar-box">
    <div class="calendar-title">
      <div class="calendar-title-left">
        <v-icon size="small"> mdi-calendar-clock </v-icon>
        <span>今日素材</span>
        <span>{{ dateNow }}</span>
      </div>
      <div class="calendar-title-right">
        <v-btn
          v-for="text of btnText"
          :key="text.week"
          :class="btnNow === text.week ? 'calendar-btn-selected' : 'calendar-btn'"
          @click="getContents(text.week)"
        >
          {{ text.text }}
        </v-btn>
      </div>
    </div>
    <TSubLine>角色突破</TSubLine>
    <div class="calendar-grid">
      <div v-for="item in characterCards" :key="item.id" @click="selectAvatar(item)">
        <TibCalendarItem
          :data="<TGApp.App.Calendar.Item>item"
          :model="'avatar'"
          :clickable="true"
        />
      </div>
    </div>
    <TSubLine>武器突破</TSubLine>
    <div class="calendar-grid">
      <div v-for="item in weaponCards" :key="item.id" @click="selectWeapon(item)">
        <TibCalendarItem
          :data="<TGApp.App.Calendar.Item>item"
          :model="'weapon'"
          :clickable="true"
        />
      </div>
    </div>
    <ToCalendar v-model="showItem" :data-type="selectedType" :data-val="selectedItem" />
  </div>
</template>
<script lang="ts" setup>
// vue
import { computed, onMounted, ref } from "vue";
import TSubLine from "./t-subline.vue";
import ToCalendar from "../overlay/to-calendar.vue";
import TibCalendarItem from "../itembox/tib-calendar-item.vue";
// data
import { AppCalendarData } from "../../data";

// loading
const loading = ref<boolean>(true);

// data
const calendarData = computed<TGApp.App.Calendar.Item[]>(() => AppCalendarData);
const weekNow = ref<number>(0);
const btnNow = ref<number>(0);
const dateNow = ref<string>("");

// calendar
const calendarNow = ref<TGApp.App.Calendar.Item[]>([]);
const characterCards = ref<TGApp.App.Calendar.Item[]>([]);
const weaponCards = ref<TGApp.App.Calendar.Item[]>([]);

// calendar item
const showItem = ref<boolean>(false);
const selectedItem = ref<TGApp.App.Calendar.Item>({} as TGApp.App.Calendar.Item);
const selectedType = ref<"avatar" | "weapon">("avatar");

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

// expose
defineExpose({
  name: "素材日历",
  loading,
});

onMounted(() => {
  const dayNow = new Date().getDay() === 0 ? 7 : new Date().getDay();
  dateNow.value = new Date()
    .toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    .replace(/\//g, "-");
  weekNow.value = dayNow;
  btnNow.value = dayNow;
  calendarNow.value = getCalendar(dayNow);
  characterCards.value = calendarNow.value.filter((item) => item.itemType === "character");
  weaponCards.value = calendarNow.value.filter((item) => item.itemType === "weapon");
  loading.value = false;
});

// 获取当前日历
function getCalendar(day: number): TGApp.App.Calendar.Item[] {
  return calendarData.value.filter((item) => item.dropDays.includes(day));
}

function selectAvatar(item: TGApp.App.Calendar.Item): void {
  selectedItem.value = item;
  selectedType.value = "avatar";
  showItem.value = true;
}

function selectWeapon(item: TGApp.App.Calendar.Item): void {
  selectedItem.value = item;
  selectedType.value = "weapon";
  showItem.value = true;
}

function getContents(day: number): void {
  btnNow.value = day;
  calendarNow.value = getCalendar(day);
  characterCards.value = calendarNow.value.filter((item) => item.itemType === "character");
  weaponCards.value = calendarNow.value.filter((item) => item.itemType === "weapon");
}
</script>
<style lang="css" scoped>
.calendar-box {
  padding: 10px;
  border-radius: 5px;
  margin-bottom: 10px;
  box-shadow: 0 0 10px var(--common-shadow-4);
}

.calendar-title {
  display: flex;
  align-items: center;
  justify-content: start;
  padding-bottom: 5px;
  color: var(--common-text-title);
  column-gap: 2rem;
  font-family: var(--font-title);
  font-size: 20px;
}

.calendar-title-left {
  display: flex;
  align-items: center;
  justify-content: start;
  column-gap: 10px;
}

.calendar-title-right {
  display: flex;
  align-items: center;
  justify-content: start;
  column-gap: 15px;
}

.calendar-btn {
  border-radius: 5px;
  background: var(--common-bg-1);
  color: var(--common-bgt-1);
}

.calendar-btn-selected {
  border-radius: 5px;
  background: var(--common-btn-bg-1);
  color: var(--common-btn-bgt-1);
}

.calendar-grid {
  display: grid;
  grid-gap: 10px;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
}
</style>
