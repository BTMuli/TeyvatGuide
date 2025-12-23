<!-- 首页素材日历-角色生日组件 -->
<template>
  <div class="pcb-container">
    <div v-if="!isBirthday" class="pcb-top-none">
      <img alt="empty" class="pcb-top-empty" src="/source/UI/empty.webp" />
      <span>今天没有角色过生日哦~</span>
    </div>
    <div v-else class="pcb-top-active">
      <img alt="empty" class="pcb-news" src="/source/UI/act_birthday.webp" @click="toNews()" />
      <span>今天是</span>
      <TMiImg
        v-for="i in cur"
        :key="i.role_id"
        :alt="i.name"
        :ori="true"
        :src="i.head_icon"
        :title="i.name"
        class="pcb-act-icon"
        @click="toBirth(i)"
      />
      <span>的生日哦~</span>
    </div>
    <div class="pcb-next-title">即将到来：{{ next[0]?.role_birthday }}</div>
    <div v-for="i in next" :key="i.role_id" class="pcb-item">
      <TMiImg
        :alt="i.name"
        :ori="true"
        :src="i.head_icon"
        :title="i.name"
        class="pcb-i-icon"
        @click="toBirth(i)"
      />
      <div class="pcb-item-info">
        <span class="pcb-item-title">
          <span>{{ i.name }}</span>
          <span>所属：{{ i.belong === "" ? "未知" : i.belong }}</span>
        </span>
        <span class="pcb-item-desc" v-html="parseHtmlText(i.introduce)" />
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import TMiImg from "@comp/app/t-mi-img.vue";
import bbsEnum from "@enum/bbs.js";
import TSAvatarBirth from "@Sqlm/avatarBirth.js";
import useAppStore from "@store/app.js";
import { parseHtmlText } from "@utils/toolFunc.js";
import { storeToRefs } from "pinia";
import { onBeforeMount, ref, shallowRef } from "vue";
import { useRouter } from "vue-router";

import { ArcBirCalendar } from "@/data/index.js";

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
    console.log(cur.value);
  }
  next.value = await TSAvatarBirth.getNextAvatarBirth();
  console.log(next.value);
});

function hasBirthRaw(raw: TGApp.Archive.Birth.CalendarItem): boolean {
  const monthList = ArcBirCalendar[raw.role_birthday[0]];
  if (!monthList) return false;
  const find = monthList.find((i) => i.role_id === raw.role_id);
  return !!find;
}

async function toBirth(data: TGApp.Archive.Birth.CalendarItem): Promise<void> {
  let dateStr;
  const hasRaw = hasBirthRaw(data);
  if (hasRaw) {
    const date = new Date();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    dateStr = `${month}/${day}`;
    await router.push({ name: "留影叙佳期", params: { date: dateStr } });
    return;
  }
  await router.push({ name: "角色图鉴", params: { id: data.role_id } });
}

async function toNews(): Promise<void> {
  recentNewsType.value = bbsEnum.post.newsType.NEWS;
  await router.push({ name: "资讯", params: { gid: 2 } });
}
</script>
<style lang="scss" scoped>
.pcb-container {
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 8px;
  border-radius: 4px;
  background: var(--box-bg-1);
  overflow-y: auto;
  row-gap: 4px;
}

.pcb-top-active,
.pcb-top-none {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 8px;
}

.pcb-top-empty {
  position: relative;
  width: 32px;
  flex-shrink: 0;
  aspect-ratio: 1;
}

.pcb-news {
  position: relative;
  width: 32px;
  flex-shrink: 0;
  aspect-ratio: 1;
  cursor: pointer;
}

.pcb-act-icon {
  width: 32px;
  flex-shrink: 0;
  border-radius: 50%;
  aspect-ratio: 1;
  background: var(--box-bg-2);
  cursor: pointer;
}

.pcb-next-title {
  font-family: var(--font-title);
}

.pcb-item {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: flex-start;
  padding: 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-2);
  column-gap: 8px;
}

.pcb-i-icon {
  position: relative;
  height: 80px;
  flex-shrink: 0;
  border-radius: 50%;
  aspect-ratio: 1;
  background: var(--box-bg-3);
  cursor: pointer;
}

.pcb-item-info {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  row-gap: 4px;
}

.pcb-item-title {
  position: relative;
  display: flex;
  column-gap: 8px;
  font-family: var(--font-title);
  font-size: 20px;
  line-height: 24px;
}

.pcb-item-desc {
  font-size: 14px;
  line-height: 14px;
  word-break: break-all;
}
</style>
