<template>
  <v-navigation-drawer permanent :rail="rail" style="background: var(--sidebar-bg); color: #faf7e8">
    <v-list v-model:opened="open" class="side-list" density="compact" nav>
      <!-- 负责收缩侧边栏 -->
      <v-list-item @click="collapse()">
        <template v-if="rail" #prepend>
          <v-list-item-action>
            <v-icon style="color:var(--sidebar-icon)">
              mdi-chevron-right
            </v-icon>
          </v-list-item-action>
        </template>
        <template v-else #append>
          <v-list-item-action>
            <v-icon style="color:var(--sidebar-icon)">
              mdi-chevron-left
            </v-icon>
          </v-list-item-action>
        </template>
      </v-list-item>
      <!-- 菜单项 -->
      <v-list-item value="home" title="首页" link href="/">
        <template #prepend>
          <img src="/source/UI/paimon.webp" alt="homeIcon" class="side-icon">
        </template>
      </v-list-item>
      <v-list-item title="公告" value="announcements" link href="/announcements">
        <template #prepend>
          <img src="../assets/icons/board.svg" alt="annoIcon" class="side-icon">
        </template>
      </v-list-item>
      <v-list-item title="咨讯" value="news" link href="/news/2">
        <template #prepend>
          <img src="/platforms/mhy/mys.webp" alt="mihoyo" class="side-icon">
        </template>
      </v-list-item>
      <v-list-item title="成就" value="achievements" link href="/achievements">
        <template #prepend>
          <img src="../assets/icons/achievements.svg" alt="achievementsIcon" class="side-icon">
        </template>
      </v-list-item>
      <v-divider />
      <v-list-item title="测试" value="test" link href="/user/test">
        <template #prepend>
          <v-icon>mdi-test-tube</v-icon>
        </template>
      </v-list-item>
      <v-divider />
      <v-list-group value="wiki" fluid>
        <template #activator="{ props }">
          <v-list-item title="图鉴" v-bind="props">
            <template #prepend>
              <img src="/source/UI/guideMini.webp" alt="wikiIcon" class="side-icon-mini">
            </template>
          </v-list-item>
        </template>
        <v-list-item title="GCG" value="wiki-GCG" link href="/wiki/GCG">
          <template #prepend>
            <img src="../assets/icons/GCG.svg" alt="gcgIcon" class="side-icon">
          </template>
        </v-list-item>
        <v-list-item title="角色图鉴" value="wiki-character" link href="/wiki/character">
          <template #prepend>
            <img src="/source/UI/avatarMini.webp" alt="characterIcon" class="side-icon-mini">
          </template>
        </v-list-item>
        <v-list-item title="武器图鉴" value="wiki-weapon" link href="/wiki/weapon">
          <template #prepend>
            <img src="/source/UI/weaponMini.webp" alt="weaponIcon" class="side-icon-mini">
          </template>
        </v-list-item>
      </v-list-group>
      <div class="bottom-menu">
        <v-list-item>
          <template #prepend>
            <img :src="userInfo.avatar" alt="userIcon" class="side-icon">
          </template>
          <template #default>
            <v-list-item-title>
              {{ userInfo.nickname }}
            </v-list-item-title>
          </template>
        </v-list-item>
        <v-list-item :title="themeTitle" value="theme" @click="switchTheme()">
          <template #prepend>
            <v-icon style="color:var(--sidebar-icon)">
              {{ themeGet === 'default' ? 'mdi-weather-night' : 'mdi-weather-sunny' }}
            </v-icon>
          </template>
        </v-list-item>
        <v-list-item title="设置" value="config" link href="/config">
          <template #prepend>
            <img src="../assets/icons/setting.svg" alt="setting" class="side-icon">
          </template>
        </v-list-item>
      </div>
    </v-list>
  </v-navigation-drawer>
</template>

<script lang="ts" setup>
// vue
import { computed, ref, onMounted } from "vue";
// tauri
import { event } from "@tauri-apps/api";
// store
import { useAppStore } from "../store/modules/app";
import { useUserStore } from "../store/modules/user";

const appStore = useAppStore();
const userStore = useUserStore();

const userInfo = computed(() => {
  const info = userStore.getBriefInfo();
  return {
    nickname: info.nickname || "未登录",
    avatar: info.avatar || "/source/UI/defaultUser.webp",
  };
});
const rail = ref(appStore.sidebar.collapse);
// theme
const themeGet = computed({
  get () {
    return appStore.theme;
  },
  set (value: string) {
    appStore.theme = value;
  },
});
const themeTitle = computed(() => {
  return themeGet.value === "default" ? "切换为夜间模式" : "切换为日间模式";
});

const open = computed({
  get () {
    return appStore.getSubmenu();
  },
  set (value: string[]) {
    appStore.sidebar.submenu.wiki = value.includes("wiki");
  },
});

function collapse () {
  rail.value = !rail.value;
  appStore.sidebar.collapse = rail.value;
}

onMounted(async () => {
  await listenOnTheme();
});

async function listenOnTheme () {
  await event.listen("readTheme", (e) => {
    const theme = e.payload as string;
    themeGet.value = theme === "default" ? "default" : "dark";
  });
}

async function switchTheme () {
  await event.emit("readTheme", themeGet.value === "default" ? "dark" : "default");
}
</script>

<style lang="css" scoped>
.side-list {
  font-family: Genshin-Light, serif;
  height: 100vh;
}

.bottom-menu {
  position: absolute;
  width: 100%;
  bottom: 0;
}

.side-icon {
  width: 24px;
  height: 24px;
  margin-right: 32px;
  border-radius: 5px;
}

.side-icon-mini {
  width: 36px;
  height: 36px;
  transform: translateX(-6px);
  margin-right: 20px;
}
</style>
