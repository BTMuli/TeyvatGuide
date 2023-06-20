<template>
  <div class="calendar-box">
    <div class="calendar-title">
      <div class="calendar-title-left">
        <v-icon size="small">
          mdi-calendar-clock
        </v-icon>
        <span>今日素材</span>
        <span>{{ dateNow }}</span>
      </div>
      <div class="calendar-title-right">
        <v-btn
          v-for="text of btnText"
          :key="text.week"
          class="calendar-title-btn"
          :style="{
            boxShadow: text.week === weekNow ? '0 0 5px #FEC90B' : 'none',
            background: text.week === btnNow ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.3)',
          }"
          @click="getContents(text.week)"
        >
          {{ text.text }}
        </v-btn>
      </div>
    </div>
    <div class="calendar-divider" />
    <div class="calendar-sub">
      <TSubLine>角色突破</TSubLine>
      <div class="cards-grid">
        <div
          v-for="item in characterCards"
          :key="item.id"
          class="card-box"
          @click="selectContent(item, 'character')"
        >
          <TibCalendarAvatar size="100px" :model-value="item" />
        </div>
      </div>
    </div>
    <div class="calendar-sub">
      <TSubLine>武器突破</TSubLine>
      <div class="cards-grid">
        <div
          v-for="item in weaponCards"
          :key="item.id"
          class="card-box"
          @click="selectContent(item, 'weapon')"
        >
          <TibCalendarWeapon size="100px" :model-value="item" />
        </div>
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
import TibCalendarAvatar from "../itembox/tib-calendar-avatar.vue";
import TibCalendarWeapon from "../itembox/tib-calendar-weapon.vue";
// data
import { AppCalendarData } from "../../data";

// loading
const loading = ref(true as boolean);

// data
const calendarData = computed(() => AppCalendarData);
const weekNow = ref(0 as number);
const btnNow = ref(0 as number);
const dateNow = ref(new Date().toLocaleDateString());

// calendar
const calendarNow = ref([] as TGApp.App.Calendar.Item[]);
const characterCards = ref([] as TGApp.App.Calendar.Item[]);
const weaponCards = ref([] as TGApp.App.Calendar.Item[]);

// calendar item
const showItem = ref(false as boolean);
const selectedItem = ref({} as TGApp.App.Calendar.Item);
const selectedType = ref("character");

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
  const dayNow = (new Date().getDay()) === 0 ? 7 : (new Date().getDay());
  weekNow.value = dayNow;
  btnNow.value = dayNow;
  calendarNow.value = getCalendar(dayNow);
  characterCards.value = calendarNow.value.filter((item) => item.itemType === "character");
  weaponCards.value = calendarNow.value.filter((item) => item.itemType === "weapon");
  loading.value = false;
});

// 获取当前日历
function getCalendar (day: number) {
  return calendarData.value.filter((item) => item.dropDays.includes(day));
}

function selectContent (item: TGApp.App.Calendar.Item, type: string) {
  selectedItem.value = item;
  selectedType.value = type;
  showItem.value = true;
}

function getContents (day: number) {
  btnNow.value = day;
  calendarNow.value = getCalendar(day);
  characterCards.value = calendarNow.value.filter((item) => item.itemType === "character");
  weaponCards.value = calendarNow.value.filter((item) => item.itemType === "weapon");
}
</script>
<style lang="css" scoped>
.calendar-box {
  margin-bottom: 10px;
  padding: 10px;
  background: rgb(255 255 255 / 10%);
  box-shadow: 0 0 10px rgb(0 0 0 / 40%);
  border-radius: 5px;
}

.calendar-title {
  height: 45px;
  font-size: 20px;
  display: flex;
  color:rgb(255 255 255 / 80%);
}

.calendar-title-left {
  width: 20%;
  height: 45px;
  font-family: Genshin, serif;
  text-shadow: 0 0 10px rgb(0 0 0 / 80%);
  display: flex;
  align-items: center;
}

.calendar-title-left span {
  margin-left: 10px;
}

.calendar-title-right {
  width: 80%;
  font-family: Genshin-Light, serif;
  height: 45px;
}

.calendar-title-btn {
    margin-left: 10px;
    border-radius: 5px;
}

.calendar-divider {
  width: 100%;
  height: 2px;
  border-radius: 2px;
  background: rgb(0 0 0 / 40%);
}

.calendar-sub {
    margin: 5px;
}

.cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    grid-gap: 8px;
}
</style>
