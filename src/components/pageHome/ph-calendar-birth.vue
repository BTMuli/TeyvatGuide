<template>
  <div class="tcb-container">
    <div class="tcb-top-none" v-if="!isBirthday">
      <img src="/source/UI/empty.webp" alt="empty" />
      <span>今天没有角色过生日哦~</span>
    </div>
    <div class="tcb-top-active" v-else>
      <span>今天是</span>
      <img
        v-for="i in cur"
        :key="i.role_id"
        class="tcb-cur"
        :alt="i.name"
        :src="i.head_icon"
        :title="i.name"
      />
      <span>的生日哦~</span>
      <img @click="toBirth(true)" src="/source/UI/act_birthday.png" alt="empty" class="active" />
    </div>
    <div>即将到来：{{ next[0].role_birthday }}</div>
    <div v-for="i in next" :key="i.role_id" class="tcb-item">
      <img :src="i.head_icon" :alt="i.name" @click="toBirth(i)" :title="i.name" />
      <div class="tcb-item-info">
        <span>{{ i.name }} 所属：{{ i.belong === "" ? "未知" : i.belong }}</span>
        <span>{{ parseDesc(i.introduce) }}</span>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import TSAvatarBirth from "@Sqlite/modules/avatarBirth.js";
import { storeToRefs } from "pinia";
import { onBeforeMount, ref, shallowRef } from "vue";
import { useRouter } from "vue-router";

import { useAppStore } from "@/store/modules/app.js";

const router = useRouter();
const { recentNewsType } = storeToRefs(useAppStore());
const isBirthday = ref<boolean>(false);
const cur = shallowRef<Array<TGApp.Archive.Birth.CalendarItem>>([]);
const next = shallowRef<Array<TGApp.Archive.Birth.RoleItem>>([]);

onBeforeMount(async () => {
  const check = TSAvatarBirth.isAvatarBirth();
  if (check.length !== 0) {
    isBirthday.value = true;
    cur.value = check;
  }
  next.value = TSAvatarBirth.getNextAvatarBirth();
});

function toBirth(type: TGApp.Archive.Birth.RoleItem | true): void {
  let dateStr;
  if (type === true) {
    const date = new Date();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    dateStr = `${month}/${day}`;
  } else {
    dateStr = type.role_birthday;
  }
  if (type !== true) {
    router.push({ name: "留影叙佳期", params: { date: dateStr } });
    return;
  }
  if (cur.value.length > 0 && !cur.value[0].is_subscribe) {
    recentNewsType.value = "news";
    router.push("/news/2/news");
    return;
  }
  router.push({ name: "留影叙佳期", params: { date: dateStr } });
}

function parseDesc(intro: string): string {
  const dom = new DOMParser().parseFromString(intro, "text/html");
  return dom.body.textContent || "";
}
</script>
<style lang="css" scoped>
.tcb-container {
  display: flex;
  width: 100%;
  height: 100%;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 5px;
  border-radius: 5px;
  box-shadow: 0 0 5px inset var(--common-shadow-1);
  overflow-y: auto;
  row-gap: 5px;
}

.tcb-top-none,
.tcb-top-active {
  display: flex;
  align-items: center;
  justify-content: center;
}

.tcb-top-none img,
.tcb-top-active img {
  width: 40px;
  height: 40px;
}

.tcb-top-active img.active {
  margin-left: auto;
  cursor: pointer;
}

.tcb-top-active img.tcb-cur {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--common-shadow-1);
}

.tcb-item {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: flex-start;
  padding: 5px;
  border-radius: 10px;
  background: var(--box-bg-1);
}

.tcb-item img {
  height: 100px;
  aspect-ratio: 1;
  cursor: pointer;
}

.tcb-item-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.tcb-item-info :first-child {
  font-family: var(--font-title);
  font-size: 20px;
}

.tcb-item-info :last-child {
  word-break: break-all;
}
</style>
