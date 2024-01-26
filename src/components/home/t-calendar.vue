<template>
  <div class="calendar-box">
    <div class="calendar-title">
      <div class="calendar-title-left">
        <v-icon size="small" style="opacity: 0.8">mdi-calendar-clock</v-icon>
        <span>今日素材</span>
        <span>{{ dateNow }}</span>
        <!-- 如果是某人生日，礼物图标颜色为红色 -->
        <span
          v-if="birthInfo.isLogin"
          @click="toBirthday"
          class="calendar-title-gift"
          :style="{
            color: birthInfo.active ? 'var(--tgc-red-1)' : 'inherit',
          }"
          :title="birthInfo.text"
        >
          <v-icon size="small">mdi-gift</v-icon>
        </span>
      </div>
      <div class="calendar-title-mid">
        <v-btn
          v-for="text of btnText"
          :key="text.week"
          :style="{
            border: text.week === weekNow ? '1px solid var(--box-text-2)' : 'none',
            borderRadius: '5px',
            backgroundColor: text.week === btnNow ? 'var(--tgc-yellow-1)' : 'inherit',
            color: text.week === btnNow ? 'var(--box-text-4)' : 'inherit',
          }"
          variant="tonal"
          @click="getContents(text.week)"
        >
          {{ text.text }}
        </v-btn>
      </div>
      <div class="calendar-title-right">
        <v-switch
          class="calendar-title-switch"
          color="var(--common-shadow-4)"
          variant="outline"
          :label="switchType === 'avatar' ? '角色' : '武器'"
          @change="switchType = switchType === 'avatar' ? 'weapon' : 'avatar'"
        />
        <v-btn class="calendar-title-btn" @click="share" data-html2canvas-ignore>
          <template #prepend>
            <v-icon>mdi-share-variant</v-icon>
          </template>
          <span>分享</span>
        </v-btn>
      </div>
    </div>
    <v-divider class="calendar-divider" />
    <div v-show="switchType === 'avatar'" class="calendar-grid">
      <div v-for="item in characterCards" :key="item.id" @click="selectAvatar(item)">
        <TibCalendarItem
          :data="<TGApp.App.Calendar.Item>item"
          :model="'avatar'"
          :clickable="true"
        />
      </div>
    </div>
    <div v-show="switchType !== 'avatar'" class="calendar-grid">
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
import { computed, onMounted, ref } from "vue";

import { AppCalendarData } from "../../data";
import TGSqlite from "../../plugins/Sqlite";
import { useAppStore } from "../../store/modules/app";
import TGClient from "../../utils/TGClient";
import { generateShareImg } from "../../utils/TGShare";
import TibCalendarItem from "../itembox/tib-calendar-item.vue";
import ToCalendar from "../overlay/to-calendar.vue";

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
const switchType = ref<string>("avatar");
const selectedItem = ref<TGApp.App.Calendar.Item>(<TGApp.App.Calendar.Item>{});
const selectedType = ref<"avatar" | "weapon">("avatar");

// birthday
const birthInfo = ref({
  isLogin: true,
  active: false,
  text: "点击前往留影叙佳期",
});

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
  const appStore = useAppStore();
  if (appStore.isLogin) {
    const birthRes = await TGSqlite.isBirthday();
    if (birthRes !== false) {
      birthInfo.value.active = true;
      birthInfo.value.text = `今天是 ${birthRes} 的生日！`;
    }
  } else {
    birthInfo.value.isLogin = false;
  }
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
  emits("success");
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

async function share(): Promise<void> {
  const div = <HTMLElement>document.querySelector(".calendar-box");
  const showType = switchType.value === "avatar" ? "角色" : "武器";
  const title = `【今日素材】${showType}${btnNow.value}`;
  await generateShareImg(title, div);
}

// 前往留影叙佳期
async function toBirthday(): Promise<void> {
  await TGClient.open("birthday");
}
</script>
<style lang="css" scoped>
.calendar-box {
  display: flex;
  flex-direction: column;
  padding: 10px;
  border-radius: 5px;
  background: var(--box-bg-1);
  gap: 5px;
}

.calendar-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-family: var(--font-title);
  font-size: 20px;
}

.calendar-title-left {
  display: flex;
  align-items: center;
  justify-content: start;
  color: var(--common-text-title);
  column-gap: 10px;
}

.calendar-title-gift {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.calendar-title-mid {
  display: flex;
  align-items: center;
  justify-content: start;
  column-gap: 15px;
}

.calendar-title-right {
  display: flex;
  align-items: center;
  justify-content: start;
  gap: 15px;
}

.calendar-title-switch {
  display: flex;
  height: 36px;
  align-items: center;
  justify-content: center;
  color: var(--box-text-1);
}

.calendar-title-btn {
  border: 1px solid var(--common-shadow-4);
  border-radius: 5px;
  background: var(--tgc-btn-1);
  color: var(--btn-text);
}

.calendar-divider {
  margin: 10px 0;
  opacity: 0.2;
}

.calendar-grid {
  display: grid;
  grid-gap: 10px;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
}
</style>
