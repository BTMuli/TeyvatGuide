<!-- todo ui 优化。结合 birth_calendar/birth_role 数据 -->
<template>
  <div class="tcb-container">
    <img v-if="!isBirthday" src="/source/UI/empty.webp" alt="empty" />
    <img @click="toPost()" v-else src="/source/UI/act_birthday.png" alt="empty" class="active" />
    <span v-if="isBirthday" class="tcb-label" @click="toBirth('today')">
      今天是{{ cur.map((i) => i.name).join("、") }}的生日哦~
    </span>
    <span v-else>今天没有角色过生日哦~</span>
    <span v-if="next.length > 0" @click="toBirth('next')" class="tcb-label"
      >即将到来：{{ next[0].birthday[0] }}月{{ next[0].birthday[1] }}日</span
    >
    <span v-if="next.length > 0">{{ next.map((i) => i.name).join("、") }}</span>
  </div>
</template>
<script lang="ts" setup>
import { onBeforeMount, ref } from "vue";
import { useRouter } from "vue-router";

import TSAvatarBirth from "../../plugins/Sqlite/modules/avatarBirth";

const isBirthday = ref<boolean>(false);
const router = useRouter();
const cur = ref<TGApp.Sqlite.Character.AppData[]>([]);
const next = ref<TGApp.App.Character.WikiBriefInfo[]>([]);

onBeforeMount(async () => {
  const check = await TSAvatarBirth.isAvatarBirth();
  if (check.length !== 0) {
    isBirthday.value = true;
    cur.value = check;
  }
  next.value = TSAvatarBirth.getNextAvatarBirth();
});

async function toPost() {
  await router.push("/news/2");
}

function toBirth(type: "today" | "next") {
  let dateStr;
  if (type === "today") {
    const date = new Date();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    dateStr = `${month}/${day}`;
  } else {
    const month = next.value[0].birthday[0];
    const day = next.value[0].birthday[1];
    dateStr = `${month}/${day}`;
  }
  router.push({ name: "留影叙佳期", params: { date: dateStr } });
}
</script>
<style lang="css" scoped>
.tcb-container {
  display: flex;
  width: 100%;
  height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 5px inset var(--common-shadow-2);
  overflow-y: auto;
}

.tcb-container img {
  width: 100px;
  height: 100px;
}

.tcb-container img.active {
  cursor: pointer;
}

span {
  display: block;
  margin-top: 10px;
  text-align: center;
}

.tcb-label {
  flex-wrap: wrap;
  cursor: pointer;
  word-break: break-all;
}
</style>
