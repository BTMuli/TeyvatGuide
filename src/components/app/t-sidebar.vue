<template>
  <v-navigation-drawer :permanent="true" :rail="rail" class="tsb-box">
    <v-list class="side-list" density="compact" :nav="true">
      <!-- 负责收缩侧边栏 -->
      <v-list-item @click="collapse()">
        <template v-if="rail" #prepend>
          <v-list-item-action>
            <v-icon>mdi-chevron-right</v-icon>
          </v-list-item-action>
        </template>
        <template v-else #append>
          <v-list-item-action>
            <v-icon>mdi-chevron-left</v-icon>
          </v-list-item-action>
        </template>
      </v-list-item>
      <!-- 菜单项 -->
      <v-list-item :title.attr="'首页'" value="home" :link="true" href="/">
        <template #title>首页</template>
        <template #prepend>
          <img src="/source/UI/paimon.webp" alt="homeIcon" class="side-icon paimon" />
        </template>
      </v-list-item>
      <v-list-item :title.attr="'公告'" value="announcements" :link="true" href="/announcements">
        <template #title>公告</template>
        <template #prepend>
          <img src="../../assets/icons/board.svg" alt="annoIcon" class="side-icon" />
        </template>
      </v-list-item>
      <v-list-item
        :title.attr="'咨讯'"
        value="news"
        :link="true"
        :href="`/news/2/${appStore.recentNewsType}`"
      >
        <template #title>咨讯</template>
        <template #prepend>
          <img src="/platforms/mhy/mys.webp" alt="mihoyo" class="side-icon" />
        </template>
      </v-list-item>
      <v-list-item :title.attr="'帖子'" value="posts" :link="true" href="/posts">
        <template #title>帖子</template>
        <template #prepend>
          <img src="/source/UI/posts.png" alt="posts" class="side-icon" />
        </template>
      </v-list-item>
      <v-list-item :title.attr="'成就'" value="achievements" :link="true" href="/achievements">
        <template #title>成就</template>
        <template #prepend>
          <img src="../../assets/icons/achievements.svg" alt="achievementsIcon" class="side-icon" />
        </template>
      </v-list-item>
      <v-divider />
      <v-list-item :title.attr="'原神战绩'" value="record" :link="true" href="/user/record">
        <template #title>原神战绩</template>
        <template #prepend>
          <img src="/source/UI/userRecord.webp" alt="record" class="side-icon" />
        </template>
      </v-list-item>
      <v-list-item :title.attr="'我的角色'" value="character" :link="true" href="/user/characters">
        <template #title>我的角色</template>
        <template #prepend>
          <img src="/source/UI/userAvatar.webp" alt="characters" class="side-icon" />
        </template>
      </v-list-item>
      <v-list-item :title.attr="'深渊记录'" value="abyss" :link="true" href="/user/abyss">
        <template #title>深渊记录</template>
        <template #prepend>
          <img src="/source/UI/userAbyss.webp" alt="abyss" class="side-icon" />
        </template>
      </v-list-item>
      <v-list-item :title.attr="'祈愿记录'" value="gacha" :link="true" href="/user/gacha">
        <template #title>祈愿记录</template>
        <template #prepend>
          <img src="/source/UI/userGacha.webp" alt="gacha" class="side-icon" />
        </template>
      </v-list-item>
      <v-divider />
      <v-list-item
        v-show="isDevEnv"
        :title.attr="'测试页面'"
        value="test"
        :link="true"
        href="/test"
      >
        <template #title>测试页面</template>
        <template #prepend>
          <v-icon>mdi-test-tube</v-icon>
        </template>
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
          <v-list-item
            class="side-item-menu"
            title="深渊数据库"
            value="wiki-abyss"
            :link="true"
            href="/wiki/abyss"
          >
            <template #prepend>
              <img src="/source/UI/wikiAbyss.webp" alt="abyssIcon" class="side-icon-menu" />
            </template>
          </v-list-item>
          <v-list-item
            class="side-item-menu"
            title="角色图鉴"
            value="wiki-character"
            :link="true"
            href="/wiki/character/0"
          >
            <template #prepend>
              <img src="/source/UI/wikiAvatar.webp" alt="characterIcon" class="side-icon-menu" />
            </template>
          </v-list-item>
          <v-list-item
            class="side-item-menu"
            title="武器图鉴"
            value="wiki-weapon"
            :link="true"
            href="/wiki/weapon/0"
          >
            <template #prepend>
              <img src="/source/UI/wikiWeapon.webp" alt="weaponIcon" class="side-icon-menu" />
            </template>
          </v-list-item>
          <v-list-item
            class="side-item-menu"
            title="GCG"
            value="wiki-GCG"
            :link="true"
            href="/wiki/GCG"
          >
            <template #prepend>
              <img src="/source/UI/wikiGCG.webp" alt="gcgIcon" class="side-icon-menu" />
            </template>
          </v-list-item>
          <v-list-item
            class="side-item-menu"
            value="wiki-namecard"
            :link="true"
            href="/wiki/namecard"
          >
            <template #default>
              <v-icon size="20" color="var(--tgc-yellow-2)">mdi-credit-card-outline</v-icon>
              <span style="margin-left: 10px; font-size: 0.8125rem">名片图鉴</span>
            </template>
          </v-list-item>
          <v-list-item
            class="side-item-menu"
            title="材料图鉴"
            value="wiki-material"
            :link="true"
            href="/wiki/material"
          >
            <template #prepend>
              <img src="/source/UI/wikiGCG.webp" alt="gcgIcon" class="side-icon-menu" />
            </template>
          </v-list-item>
        </v-list>
      </v-menu>
      <v-list-item
        :title.attr="'留影叙佳期'"
        value="archive-birthday"
        :link="true"
        href="/archive/birthday"
      >
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
            <v-list-item
              class="side-item-menu"
              title="登录"
              @click="login"
              v-show="userStore.cookie.value?.stoken === ''"
            >
              <template #prepend>
                <img src="/source/UI/lumine.webp" class="side-icon-menu" alt="login" />
              </template>
            </v-list-item>
          </v-list>
        </v-menu>
        <v-list-item :title.attr="themeTitle" @click="switchTheme()">
          <template #title>{{ themeTitle }}</template>
          <template #prepend>
            <v-icon>
              {{ themeGet === "default" ? "mdi-weather-night" : "mdi-weather-sunny" }}
            </v-icon>
          </template>
        </v-list-item>
        <v-list-item :title.attr="'设置'" value="config" :link="true" href="/config">
          <template #title>设置</template>
          <template #prepend>
            <img src="../../assets/icons/setting.svg" alt="setting" class="side-icon" />
          </template>
        </v-list-item>
      </div>
    </v-list>
  </v-navigation-drawer>
</template>

<script lang="ts" setup>
import { event, webviewWindow } from "@tauri-apps/api";
import { UnlistenFn, Event } from "@tauri-apps/api/event";
import { storeToRefs } from "pinia";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";

import { useAppStore } from "../../store/modules/app.js";
import { useUserStore } from "../../store/modules/user.js";
import mhyClient from "../../utils/TGClient.js";
import TGLogger from "../../utils/TGLogger.js";
import showSnackbar from "../func/snackbar.js";

const appStore = useAppStore();
const userStore = storeToRefs(useUserStore());

const isDevEnv = ref<boolean>(import.meta.env.MODE === "development");

const userInfo = ref({
  nickname: "未登录",
  uid: "-1",
  desc: "请扫码登录",
  avatar: "/source/UI/lumine.webp",
});

watch(userStore.briefInfo, (val) => {
  if (val && val.nickname) {
    userInfo.value = val;
  }
});

const rail = ref(appStore.sidebar.collapse);
// theme
const themeGet = computed({
  get() {
    return appStore.theme;
  },
  set(value: string) {
    appStore.theme = value;
  },
});
const themeTitle = computed(() => {
  return themeGet.value === "default" ? "夜间模式" : "日间模式";
});

watch(themeTitle, async (val) => {
  const themeNow = val === "夜间模式" ? "浅色模式" : "深色模式";
  await TGLogger.Info(`[App][theme] 已切换到${themeNow}`);
});

function collapse(): void {
  rail.value = !rail.value;
  appStore.sidebar.collapse = rail.value;
}

let themeListener: UnlistenFn;

onMounted(async () => {
  themeListener = await event.listen("readTheme", (e: Event<string>) => {
    const theme = e.payload;
    themeGet.value = theme === "default" ? "default" : "dark";
  });
  if (webviewWindow.getCurrent().label === "TeyvatGuide") {
    await mhyClient.run();
  }
  if (userStore.briefInfo.value && userStore.briefInfo.value.nickname) {
    userInfo.value = userStore.briefInfo.value;
  }
});

async function switchTheme(): Promise<void> {
  await event.emit("readTheme", themeGet.value === "default" ? "dark" : "default");
}

async function openClient(func: string): Promise<void> {
  if (appStore.isLogin) {
    await mhyClient.open(func);
  } else {
    login();
  }
}

function login(): void {
  showSnackbar({
    text: "请前往设置页面登录！",
    color: "warn",
  });
}

onUnmounted(() => themeListener());
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
