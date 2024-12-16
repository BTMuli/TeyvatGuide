<template>
  <v-navigation-drawer :permanent="true" :rail="rail" class="tsb-box">
    <v-list class="side-list" density="compact" :nav="true">
      <v-list-item
        @click="rail = !rail"
        :prepend-icon="rail ? 'mdi-chevron-right' : undefined"
        :append-icon="!rail ? 'mdi-chevron-left' : undefined"
      />
      <!-- 菜单项 -->
      <v-list-item :title.attr="'首页'" :link="true" href="/">
        <template #title>首页</template>
        <template #prepend>
          <img src="/source/UI/paimon.webp" alt="homeIcon" class="side-icon paimon" />
        </template>
      </v-list-item>
      <v-list-item title.attr="'公告'" :link="true" href="/announcements">
        <template #title>公告</template>
        <template #prepend>
          <img src="@/assets/icons/board.svg" alt="annoIcon" class="side-icon" />
        </template>
      </v-list-item>
      <v-list-item :title.attr="'咨讯'" :link="true" :href="`/news/2/${recentNewsType}`">
        <template #title>咨讯</template>
        <template #prepend>
          <img src="/platforms/mhy/mys.webp" alt="mihoyo" class="side-icon" />
        </template>
      </v-list-item>
      <v-list-item :title.attr="'帖子'" :link="true" href="/posts/forum">
        <template #title>帖子</template>
        <template #prepend>
          <img src="/source/UI/posts.png" alt="posts" class="side-icon" />
        </template>
      </v-list-item>
      <v-list-item :title.attr="'成就'" :link="true" href="/achievements">
        <template #title>成就</template>
        <template #prepend>
          <img src="@/assets/icons/achievements.svg" alt="achievementsIcon" class="side-icon" />
        </template>
      </v-list-item>
      <v-divider />
      <v-list-item :title.attr="'原神战绩'" :link="true" href="/user/record">
        <template #title>原神战绩</template>
        <template #prepend>
          <img src="/source/UI/userRecord.webp" alt="record" class="side-icon" />
        </template>
      </v-list-item>
      <v-list-item :title.attr="'我的角色'" :link="true" href="/user/characters">
        <template #title>我的角色</template>
        <template #prepend>
          <img src="/source/UI/userAvatar.webp" alt="characters" class="side-icon" />
        </template>
      </v-list-item>
      <v-list-item :title.attr="'深渊记录'" :link="true" href="/user/abyss">
        <template #title>深渊记录</template>
        <template #prepend>
          <img src="/source/UI/userAbyss.webp" alt="abyss" class="side-icon" />
        </template>
      </v-list-item>
      <v-list-item :title.attr="'祈愿记录'" :link="true" href="/user/gacha">
        <template #title>祈愿记录</template>
        <template #prepend>
          <img src="/source/UI/userGacha.webp" alt="gacha" class="side-icon" />
        </template>
      </v-list-item>
      <v-divider />
      <v-list-item
        v-show="isDevEnv"
        :title.attr="'测试页面'"
        :link="true"
        href="/test"
        prepend-icon="mdi-test-tube"
      >
        <template #title>测试页面</template>
      </v-list-item>
      <v-divider v-show="isDevEnv" />
      <v-menu :open-on-click="true" location="end">
        <template #activator="{ props }">
          <v-list-item :title.attr="'图鉴'" v-bind="props">
            <template #title>图鉴</template>
            <template #prepend>
              <img src="/source/UI/wikiIcon.webp" alt="wikiIcon" class="side-icon" />
            </template>
          </v-list-item>
        </template>
        <v-list class="side-list-menu wiki" density="compact" :nav="true">
          <v-list-item class="side-item-menu" title="深渊数据库" :link="true" href="/wiki/abyss">
            <template #prepend>
              <img src="/source/UI/wikiAbyss.webp" alt="abyssIcon" class="side-icon-menu" />
            </template>
          </v-list-item>
          <v-list-item class="side-item-menu" title="角色图鉴" :link="true" href="/wiki/character">
            <template #prepend>
              <img src="/source/UI/wikiAvatar.webp" alt="characterIcon" class="side-icon-menu" />
            </template>
          </v-list-item>
          <v-list-item class="side-item-menu" title="武器图鉴" :link="true" href="/wiki/weapon">
            <template #prepend>
              <img src="/source/UI/wikiWeapon.webp" alt="weaponIcon" class="side-icon-menu" />
            </template>
          </v-list-item>
          <v-list-item
            class="side-item-menu"
            :link="true"
            href="/wiki/nameCard"
            prepend-icon="mdi-credit-card-outline"
            title="名片图鉴"
          />
          <v-list-item class="side-item-menu" title="材料图鉴" :link="true" href="/wiki/material">
            <template #prepend>
              <img src="/source/UI/wikiGCG.webp" alt="gcgIcon" class="side-icon-menu" />
            </template>
          </v-list-item>
        </v-list>
      </v-menu>
      <v-list-item :title.attr="'留影叙佳期'" :link="true" href="/archive/birthday">
        <template #title>留影叙佳期</template>
        <template #prepend>
          <img src="/source/UI/act_birthday.png" alt="archive_birthday_icon" class="side-icon" />
        </template>
      </v-list-item>
      <div class="bottom-menu">
        <v-menu :open-on-click="true" location="end">
          <template #activator="{ props }">
            <v-list-item :title.attr="userInfo.nickname" v-bind="props">
              <template #title>{{ userInfo.nickname }}</template>
              <template #prepend>
                <img :src="userInfo.avatar" alt="userIcon" class="side-icon paimon" />
              </template>
            </v-list-item>
          </template>
          <v-list class="side-list-menu" density="compact" :nav="true">
            <v-list-item class="side-item-menu" title="签到" @click="openClient('sign_in')">
              <template #prepend>
                <img src="/source/UI/userGacha.webp" class="side-icon-menu" alt="sing_in" />
              </template>
            </v-list-item>
            <v-list-item class="side-item-menu" title="战绩" @click="openClient('game_record')">
              <template #prepend>
                <img src="/source/UI/userRecord.webp" class="side-icon-menu" alt="game_record" />
              </template>
            </v-list-item>
            <v-list-item class="side-item-menu" title="便笺" @click="openClient('daily_note')">
              <template #prepend>
                <img src="/icon/material/210.webp" class="side-icon-menu" alt="daily_note" />
              </template>
            </v-list-item>
            <v-list-item class="side-item-menu" title="收藏" :link="true" href="/collection">
              <template #prepend>
                <img src="/source/UI/posts.png" alt="collect" class="side-icon-menu" />
              </template>
            </v-list-item>
          </v-list>
        </v-menu>
        <v-list-item
          :title.attr="themeTitle"
          @click="switchTheme()"
          :prepend-icon="theme === 'default' ? 'mdi-weather-night' : 'mdi-weather-sunny'"
        >
          <template #title>{{ themeTitle }}</template>
        </v-list-item>
        <v-list-item :title.attr="'设置'" value="config" :link="true" href="/config">
          <template #title>设置</template>
          <template #prepend>
            <img src="@/assets/icons/setting.svg" alt="setting" class="side-icon" />
          </template>
        </v-list-item>
      </div>
    </v-list>
  </v-navigation-drawer>
</template>
<script lang="ts" setup>
import showSnackbar from "@comp/func/snackbar.js";
import { event, webviewWindow } from "@tauri-apps/api";
import type { Event, UnlistenFn } from "@tauri-apps/api/event";
import { storeToRefs } from "pinia";
import { computed, onMounted, onUnmounted } from "vue";

import { useAppStore } from "@/store/modules/app.js";
import { useUserStore } from "@/store/modules/user.js";
import mhyClient from "@/utils/TGClient.js";

const { sidebar, theme, isLogin, recentNewsType } = storeToRefs(useAppStore());
const { briefInfo } = storeToRefs(useUserStore());
let themeListener: UnlistenFn | null = null;
// @ts-expect-error The import.meta meta-property is not allowed in files which will build into CommonJS output.
const isDevEnv = import.meta.env.MODE === "development";
const rail = computed<boolean>({
  get: () => sidebar.value.collapse,
  set: (v) => (sidebar.value.collapse = v),
});
const userInfo = computed<TGApp.App.Account.BriefInfo>(() => {
  if (briefInfo.value && briefInfo.value.nickname) return briefInfo.value;
  return { nickname: "未登录", uid: "-1", desc: "请扫码登录", avatar: "/source/UI/lumine.webp" };
});
const themeTitle = computed<string>(() => (theme.value === "default" ? "夜间模式" : "日间模式"));

onMounted(async () => {
  themeListener = await event.listen<string>("readTheme", (e: Event<string>) => {
    theme.value = e.payload === "default" ? "default" : "dark";
  });
  if (webviewWindow.getCurrentWebviewWindow().label === "TeyvatGuide") await mhyClient.run();
});

async function switchTheme(): Promise<void> {
  await event.emit("readTheme", theme.value === "default" ? "dark" : "default");
}

async function openClient(func: string): Promise<void> {
  if (isLogin.value) await mhyClient.open(func);
  else showSnackbar.warn("请前往设置页面登录！");
}

onUnmounted(() => {
  if (themeListener !== null) {
    themeListener();
    themeListener = null;
  }
});
</script>
<style lang="css" scoped>
.tsb-box {
  background: var(--app-side-bg);
  color: var(--app-side-content);
}

.side-list {
  height: 100%;
  font-family: var(--font-title);
}

.bottom-menu {
  position: absolute;
  bottom: 0;
  width: 100%;
}

.side-icon {
  width: 24px;
  height: 24px;
  border-radius: 5px;
  margin-right: 32px;
}

.side-icon.paimon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  margin-right: 24px;
  transform: translateX(-4px);
}

.side-list-menu {
  background: var(--app-side-bg) !important;
  color: var(--app-side-content) !important;
  font-family: var(--font-title);
}

.side-list-menu.wiki {
  margin-left: 10px;
}

.side-item-menu {
  border: 1px solid var(--common-shadow-2);
  background: var(--box-bg-1);
}

.side-icon-menu {
  width: 20px;
  height: 20px;
  border-radius: 5px;
  margin-right: 10px;
}
</style>
