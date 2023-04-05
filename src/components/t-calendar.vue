<template>
<v-list class="calendar-card">
  <v-list-item>
    <v-list-item-title style="color: #fec90b; margin-left: 10px; margin-bottom: 10px; font-family: Genshin, serif">
      <v-icon color="#EBD49E">
        mdi-calendar-clock
      </v-icon> 今日素材
      <span style="color: #faf7e8">{{ new Date().toLocaleDateString() }}</span>
      <v-btn
        v-for="text of btnText"
        :key="text.week"
        class="calendar-btn"
        :style="{
          border: text.week === weekNow ? '2px solid #fec90b' : '0',
          background: text.week === btnNow ? '#fec90b' : '#4A5366',
        }"
        @click="getShowCards(text.week)"
      >
        {{ text.text }}
      </v-btn>
    </v-list-item-title>
    <div v-if="!loading" class="calendar-grid">
      <v-card title="天赋培养" class="calendar-single">
        <v-card-text class="calendar-icons">
          <v-img v-for="item in showCharacters" :key="item.id" :src="item.cover" class="calendar-icon" @click="showContent(item)" />
        </v-card-text>
      </v-card>
      <v-card title="武器突破" class="calendar-single">
        <v-card-text class="calendar-icons">
          <v-img v-for="item in showWeapons" :key="item.id" :src="item.cover" class="calendar-icon" @click="showContent(item)" />
        </v-card-text>
      </v-card>
    </div>
  </v-list-item>
</v-list>
</template>
<script lang="ts" setup>
// vue
import { ref, onMounted } from "vue";
// plugins
import MysOper from "../plugins/Mys";
// interface
import { CalendarCard } from "../plugins/Mys/interface/calendar";
import { OBC_CONTENT_API } from "../plugins/Mys/interface/utils";

// loading
const loading = ref(true as boolean);

// data
const characterCards = ref([] as CalendarCard[]);
const weaponCards = ref([] as CalendarCard[]);
const weekNow = ref(new Date().getDay());
const btnNow = ref(0 as number);

const btnText = [
  {
    week: 0,
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

// show data
const showCharacters = ref([] as CalendarCard[]);
const showWeapons = ref([] as CalendarCard[]);

// expose
defineExpose({
  name: "素材日历",
  loading,
});

onMounted(async () => {
  const calendarData = await MysOper.Calendar.get();
  if (!calendarData) {
    await console.error("获取材料日历失败");
    return;
  }
  const calendarCards = MysOper.Calendar.card(calendarData);
  const week = new Date().getDay();
  btnNow.value = week;
  characterCards.value = calendarCards.filter((card) => card.type === 2);
  weaponCards.value = calendarCards.filter((card) => card.type === 1);
  getShowCards(week);
  loading.value = false;
});

// 根据星期几获取显示内容
function getShowCards (choice: number) {
  btnNow.value = choice;
  const week = choice === 0 ? 7 : choice;
  showCharacters.value = characterCards.value
    .filter((card) => card.drop_day.includes(week.toString()))
    .sort((a, b) => a.sort_day[week] - b.sort_day[week]);
  showWeapons.value = weaponCards.value
    .filter((card) => card.drop_day.includes(week.toString()))
    .sort((a, b) => a.sort_day[week] - b.sort_day[week]);
}

function showContent (item: CalendarCard) {
  // todo：二级跳转，目前先直接跳到角色详情页
  window.open(OBC_CONTENT_API.replace("{content_id}", item.url));
}
</script>
<style lang="css" scoped>
.calendar-card {
	margin-top: 10px;
	font-family: Genshin-Light, serif;
	background: #546d8b;
	border-radius: 10px;
}

.calendar-grid {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	grid-gap: 10px;
	margin: 10px;
}

.calendar-single {
	background: #faf7e8;
	color: #546d8b;
	border-radius: 10px;
}

.calendar-icons {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(50px, 1fr));
	grid-gap: 5px;
}

.calendar-icon {
	width: 50px;
	height: 50px;
	margin: 5px;
	border-radius: 10px;
}

.calendar-icon :hover {
	cursor: pointer;
}

.calendar-btn {
	margin-left: 10px;
	font-family: Genshin-Light, serif;
	color: #faf7e8;
	border-radius: 10px;
}
</style>
