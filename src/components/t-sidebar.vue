<template>
  <v-navigation-drawer permanent :rail="rail" style="background: #485466; color: #faf7e8">
    <v-list v-model:opened="open" class="side-list" density="compact" nav>
      <!-- 负责收缩侧边栏 -->
      <v-list-item @click="collapse">
        <template v-if="rail" #prepend>
          <v-list-item-action>
            <v-icon color="rgb(205, 182, 145)">
              mdi-chevron-right
            </v-icon>
          </v-list-item-action>
        </template>
        <template v-else #append>
          <v-list-item-action>
            <v-icon color="rgb(205, 182, 145)">
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
      <v-divider />
      <v-list-group value="mihoyo" fluid>
        <template #activator="{ props }">
          <v-list-item title="米游社" v-bind="props">
            <template #prepend>
              <img src="/platforms/mhy/mys.webp" alt="mihoyo" class="side-icon">
            </template>
          </v-list-item>
        </template>
        <v-list-item title="原神" value="mhy-ys" link href="/news/2">
          <template #prepend>
            <img src="/platforms/mhy/ys.webp" alt="ys" class="side-icon">
          </template>
        </v-list-item>
        <v-list-item title="崩坏3" value="mhy-bh3" link href="/news/1">
          <template #prepend>
            <img src="/platforms/mhy/bh3.webp" alt="bh3" class="side-icon">
          </template>
        </v-list-item>
        <v-list-item title="崩坏2" value="mhy-bh2" link href="/news/3">
          <template #prepend>
            <img src="/platforms/mhy/bh2.webp" alt="bh2" class="side-icon">
          </template>
        </v-list-item>
        <v-list-item title="未定事件簿" value="mhy-wd" link href="/news/4">
          <template #prepend>
            <img src="/platforms/mhy/wd.webp" alt="wd" class="side-icon">
          </template>
        </v-list-item>
        <v-list-item title="星穹铁道" value="mhy-sr" link href="/news/6">
          <template #prepend>
            <img src="/platforms/mhy/sr.webp" alt="sr" class="side-icon">
          </template>
        </v-list-item>
        <v-list-item title="绝区零" value="mhy-zzz" link href="/news/8">
          <template #prepend>
            <img src="/platforms/mhy/zzz.webp" alt="zzz" class="side-icon">
          </template>
        </v-list-item>
        <v-list-item title="大别野" value="mhy-dby" link href="/news/5">
          <template #prepend>
            <img src="/platforms/mhy/dby.webp" alt="dby" class="side-icon">
          </template>
        </v-list-item>
      </v-list-group>
      <v-divider />
      <v-list-item title="成就" value="achievements" link href="/achievements">
        <template #prepend>
          <img src="../assets/icons/achievements.svg" alt="achievementsIcon" class="side-icon">
        </template>
      </v-list-item>
      <v-divider />
      <v-list-group value="database" fluid>
        <template #activator="{ props }">
          <v-list-item title="数据库" v-bind="props">
            <template #prepend>
              <v-icon color="rgb(205, 182, 145)">
                mdi-database
              </v-icon>
            </template>
          </v-list-item>
        </template>
        <v-list-item title="GCG" value="db-GCG" link href="/GCG">
          <template #prepend>
            <img src="../assets/icons/GCG.svg" alt="gcgIcon" class="side-icon">
          </template>
        </v-list-item>
      </v-list-group>
      <v-divider />
      <v-list-item title="设置" value="config" link href="/config">
        <template #prepend>
          <img src="../assets/icons/setting.svg" alt="setting" class="side-icon">
        </template>
      </v-list-item>
    </v-list>
  </v-navigation-drawer>
</template>

<script lang="ts" setup>
// vue
import { computed, ref } from "vue";
// store
import useAppStore from "../store/modules/app";

const appStore = useAppStore();

const rail = ref(appStore.sidebar.collapse);
const open = computed({
  get () {
    return appStore.getSubmenu();
  },
  set (value: string[]) {
    appStore.sidebar.submenu.mihoyo = value.includes("mihoyo");
    appStore.sidebar.submenu.database = value.includes("database");
  },
});

function collapse () {
  rail.value = !rail.value;
  appStore.sidebar.collapse = rail.value;
}
</script>

<style lang="css" scoped>
.side-list {
  font-family: Genshin-Light, serif;
}

.side-icon {
  width: 24px;
  height: 24px;
  margin-right: 32px;
  border-radius: 5px;
}
</style>
