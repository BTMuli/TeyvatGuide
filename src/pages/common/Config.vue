<template>
  <ToLoading v-model="loading" :title="loadingTitle" :subtitle="loadingSub" />
  <ToGameLogin v-model="scan" />
  <v-list class="config-list">
    <v-list-subheader :inset="true" class="config-header"> 应用信息</v-list-subheader>
    <v-divider :inset="true" class="border-opacity-75" />
    <v-list-item title="Tauri 版本" @click="toOuter('https://next--tauri.netlify.app/')">
      <template #prepend>
        <img class="config-icon" src="/platforms/tauri.webp" alt="Tauri" />
      </template>
      <template #append>
        <v-list-item-subtitle>{{ versionTauri }}</v-list-item-subtitle>
      </template>
    </v-list-item>
    <v-list-item>
      <template #prepend>
        <img class="config-icon" src="/icon.webp" alt="App" />
      </template>
      <v-list-item-title>
        应用版本
        <v-btn
          size="small"
          variant="outlined"
          @click="toOuter('https://github.com/BTMuli/Tauri.Genshin/releases/latest')"
        >
          BETA
        </v-btn>
      </v-list-item-title>
      <template #append>
        <v-list-item-subtitle>{{ versionApp }}.{{ buildTime }}</v-list-item-subtitle>
      </template>
    </v-list-item>
    <v-list-item title="成就版本">
      <template #prepend>
        <img class="config-icon" src="../../assets/icons/achievements.svg" alt="Achievements" />
      </template>
      <template #append>
        <v-list-item-subtitle>{{ achievementsStore.lastVersion }}</v-list-item-subtitle>
      </template>
    </v-list-item>
    <v-list-item title="登录信息">
      <v-list-item-subtitle v-show="userInfo.nickname !== '未登录'">
        {{ userInfo.nickname }} uid:{{ userInfo.uid }}
      </v-list-item-subtitle>
      <v-list-item-subtitle v-show="userInfo.nickname === '未登录'">
        未登录，请扫码登录！
      </v-list-item-subtitle>
      <template #prepend>
        <img class="config-icon" :src="userInfo.avatar" alt="Login" />
      </template>
      <template #append>
        <v-btn class="config-btn" @click="confirmScanLogin">扫码登录</v-btn>
        <v-btn class="config-btn" @click="confirmRefreshUser"> 刷新数据 </v-btn>
      </template>
    </v-list-item>
    <v-list-subheader :inset="true" class="config-header">系统信息</v-list-subheader>
    <v-divider :inset="true" class="border-opacity-75" />
    <v-list-item title="系统平台">
      <template #prepend>
        <v-icon>mdi-desktop-classic</v-icon>
      </template>
      <template #append>
        <v-list-item-subtitle>{{ osPlatform }}</v-list-item-subtitle>
      </template>
    </v-list-item>
    <v-list-item title="系统版本">
      <template #prepend>
        <v-icon>mdi-desktop-classic</v-icon>
      </template>
      <template #append>
        <v-list-item-subtitle>{{ osVersion }}</v-list-item-subtitle>
      </template>
    </v-list-item>
    <v-list-item title="数据库更新时间" prepend-icon="mdi-database">
      <template #append>
        <v-list-item-subtitle
          >{{ dbInfo.find((item) => item.key === "dataUpdated")?.value }}
        </v-list-item-subtitle>
      </template>
      <v-list-item-subtitle
        >更新于
        {{ dbInfo.find((item) => item.key === "dataUpdated")?.updated }}
      </v-list-item-subtitle>
    </v-list-item>
    <v-list-item title="数据库版本" prepend-icon="mdi-database">
      <template #append>
        <v-list-item-subtitle
          >{{ dbInfo.find((item) => item.key === "appVersion")?.value }}
        </v-list-item-subtitle>
      </template>
      <v-list-item-subtitle
        >更新于
        {{ dbInfo.find((item) => item.key === "appVersion")?.updated }}
      </v-list-item-subtitle>
    </v-list-item>
    <v-list-subheader :inset="true" class="config-header"> 设置</v-list-subheader>
    <v-divider :inset="true" class="border-opacity-75" />
    <v-list-item>
      <template #prepend>
        <v-icon>mdi-view-dashboard</v-icon>
      </template>
      <v-select
        v-model="showHome"
        :items="homeStore.getShowItems()"
        label="首页显示组件"
        :multiple="true"
        :chips="true"
      />
      <template #append>
        <v-btn class="config-btn" @click="submitHome"> 确定</v-btn>
      </template>
    </v-list-item>
    <v-list-item prepend-icon="mdi-content-save" title="数据备份" @click="confirmBackup" />
    <v-list-item prepend-icon="mdi-content-save" title="数据恢复" @click="confirmRestore" />
    <v-list-item prepend-icon="mdi-content-save" title="数据更新" @click="confirmUpdate()" />
    <v-list-item prepend-icon="mdi-delete" title="清除用户缓存" @click="confirmDelUC" />
    <v-list-item prepend-icon="mdi-delete" title="清除临时数据" @click="confirmDelTemp" />
    <v-list-item prepend-icon="mdi-cog" title="恢复默认设置" @click="confirmResetApp" />
    <v-list-subheader :inset="true" class="config-header"> 调试</v-list-subheader>
    <v-divider :inset="true" class="border-opacity-75" />
    <v-list-item v-if="appStore.devEnv" title="调试模式" subtitle="开启后将显示调试信息">
      <template #prepend>
        <v-icon>mdi-bug</v-icon>
      </template>
      <template #append>
        <v-switch
          v-model="appStore.devMode"
          :label="appStore.devMode ? '开启' : '关闭'"
          :inset="true"
          color="#FAC51E"
          @click="submitDevMode"
        />
      </template>
    </v-list-item>
    <v-list-item title="重置数据库" prepend-icon="mdi-delete" @click="confirmResetDB()" />
    <v-list-item
      title="检测 SQLite 数据库完整性"
      prepend-icon="mdi-database-check"
      @click="confirmCheckDB"
    />
    <v-list-subheader :inset="true" class="config-header"> 路径</v-list-subheader>
    <v-divider :inset="true" class="border-opacity-75" />
    <v-list-item prepend-icon="mdi-database">
      <v-list-item-title>本地数据库路径</v-list-item-title>
      <v-list-item-subtitle>{{ appStore.dataPath.dbDataPath }}</v-list-item-subtitle>
    </v-list-item>
    <v-list-item prepend-icon="mdi-folder">
      <v-list-item-title>本地临时数据路径</v-list-item-title>
      <v-list-item-subtitle>{{ appStore.dataPath.tempDataDir }}</v-list-item-subtitle>
    </v-list-item>
    <v-list-item prepend-icon="mdi-folder">
      <v-list-item-title>本地用户数据路径</v-list-item-title>
      <v-list-item-subtitle>{{ appStore.dataPath.userDataDir }}</v-list-item-subtitle>
    </v-list-item>
  </v-list>
</template>

<script lang="ts" setup>
// vue
import { computed, onMounted, ref } from "vue";
import showSnackbar from "../../components/func/snackbar";
import showConfirm from "../../components/func/confirm";
import ToLoading from "../../components/overlay/to-loading.vue";
import ToGameLogin from "../../components/overlay/to-gameLogin.vue";
// tauri
import { app, fs, os } from "@tauri-apps/api";
// store
import { useAppStore } from "../../store/modules/app";
import { useHomeStore } from "../../store/modules/home";
import { useAchievementsStore } from "../../store/modules/achievements";
import { useUserStore } from "../../store/modules/user";
// utils
import { backupUiafData, restoreUiafData } from "../../utils/UIAF";
import { backupAbyssData, backupCookieData } from "../../web/utils/backupData";
import { restoreAbyssData, restoreCookieData } from "../../web/utils/restoreData";
import TGSqlite from "../../plugins/Sqlite";
import TGRequest from "../../web/request/TGRequest";

// Store
const appStore = useAppStore();
const userStore = useUserStore();
const homeStore = useHomeStore();
const achievementsStore = useAchievementsStore();

// About App
const versionApp = ref<string>("");
const versionTauri = ref<string>("");
const buildTime = computed(() => appStore.buildTime);

// About OS
const osPlatform = ref<string>("");
const osVersion = ref<string>("");
const dbInfo = ref<Array<{ key: string; value: string; updated: string }>>([]);

// loading
const loading = ref<boolean>(true);
const loadingTitle = ref<string>("正在加载...");
const loadingSub = ref<string>("");
const scan = ref<boolean>(false);

// data
const showHome = ref<string[]>(homeStore.getShowValue());
const userInfo = computed(() => {
  const info = userStore.getBriefInfo();
  return {
    nickname: info.nickname || "未登录",
    uid: info.uid || "-1",
    desc: info.desc || "未登录",
    avatar: info.avatar || "/source/UI/defaultUser.webp",
  };
});

// load version
onMounted(async () => {
  loadingSub.value = "正在获取应用版本";
  versionApp.value = await app.getVersion();
  loadingSub.value = "正在获取 Tauri 版本";
  versionTauri.value = await app.getTauriVersion();
  loadingSub.value = "正在获取系统信息";
  osPlatform.value = `${await os.platform()}`;
  loadingSub.value = "正在获取系统版本";
  osVersion.value = await os.version();
  loadingSub.value = "";
  loading.value = false;
});

// 打开外部链接
function toOuter(url: string): void {
  window.open(url);
}

// 扫码登录
async function confirmScanLogin(): Promise<void> {
  const confirmRes = await showConfirm({
    title: "请使用米游社 APP 执行操作",
    text: "请在成功后刷新数据",
  });
  if (confirmRes) {
    scan.value = true;
  } else {
    showSnackbar({
      color: "grey",
      text: "已取消扫码登录",
    });
  }
}

// 刷新用户信息
async function confirmRefreshUser(): Promise<void> {
  const res = await showConfirm({
    title: "确认刷新用户信息吗？",
    text: "将会重新获取用户信息",
  });
  if (!res) {
    showSnackbar({
      color: "grey",
      text: "已取消刷新",
    });
    return;
  }
  const ck = userStore.cookie;
  if (Object.keys(ck).length < 1) {
    showSnackbar({
      color: "error",
      text: "扫码登录后才能刷新用户信息!",
    });
    return;
  }
  let failCount = 0;
  loadingTitle.value = "正在验证 ltoken...";
  loading.value = true;
  const verifyLTokenRes = await TGRequest.User.byLToken.verify(ck.ltoken, ck.ltuid);
  if (typeof verifyLTokenRes === "string") {
    loadingTitle.value = "验证成功!正在刷新 cookie_token";
  } else {
    console.error(verifyLTokenRes);
    loadingTitle.value = "验证失败!正在重新获取 ltoken";
    const ltokenRes = await TGRequest.User.bySToken.getLToken(ck.mid, ck.stoken);
    if (typeof ltokenRes === "string") {
      ck.ltoken = ltokenRes;
      loadingTitle.value = "刷新成功!正在获取用户头像、昵称信息";
    } else {
      console.error(ltokenRes);
      loadingTitle.value = "刷新失败!正在获取用户头像、昵称信息";
      failCount++;
    }
  }
  const cookieTokenRes = await TGRequest.User.bySToken.getCookieToken(ck.mid, ck.stoken);
  if (typeof cookieTokenRes === "string") {
    ck.cookie_token = cookieTokenRes;
    console.log(JSON.stringify(ck));
    loadingTitle.value = "刷新成功!正在获取用户头像、昵称信息";
  } else {
    console.error(cookieTokenRes);
    loadingTitle.value = "刷新失败!正在获取用户头像、昵称信息";
    failCount++;
  }
  await TGSqlite.saveAppData("cookie", JSON.stringify(ck));
  const infoRes = await TGRequest.User.byCookie.getUserInfo(ck.cookie_token, ck.account_id);
  if ("nickname" in infoRes) {
    userStore.setBriefInfo(infoRes);
    loadingTitle.value = "获取成功!正在获取用户游戏账号信息";
  } else {
    console.error(infoRes);
    loadingTitle.value = "获取失败!正在获取用户游戏账号信息";
    failCount++;
  }
  const accountRes = await TGRequest.User.byCookie.getAccounts(ck.cookie_token, ck.account_id);
  if (Array.isArray(accountRes)) {
    loadingTitle.value = "获取成功!正在保存到数据库!";
    await TGSqlite.saveAccount(accountRes);
  } else {
    console.error(accountRes);
    loadingTitle.value = "获取失败!";
    failCount++;
  }
  loading.value = false;
  if (failCount > 0) {
    showSnackbar({
      color: "error",
      text: "刷新失败!重试或者重新扫码登录！",
    });
  } else {
    showSnackbar({ text: "刷新成功!" });
  }
}

// 备份数据
async function confirmBackup(): Promise<void> {
  const res = await showConfirm({
    title: "确认备份数据吗？",
    text: "若已备份将会被覆盖，祈愿数据备份请到对应页面执行",
  });
  if (!res) {
    showSnackbar({
      color: "grey",
      text: "已取消备份",
    });
    return;
  }
  loadingTitle.value = "正在备份数据...";
  loading.value = true;
  loadingSub.value = "正在获取成就数据";
  const achievements = await TGSqlite.getUIAF();
  loadingSub.value = "正在备份成就数据";
  await backupUiafData(achievements);
  loadingSub.value = "正在获取 Cookie";
  const cookie = await TGSqlite.getCookie();
  loadingSub.value = "正在备份 Cookie";
  await backupCookieData(cookie);
  loadingSub.value = "正在获取深渊数据";
  const abyss = await TGSqlite.getAbyss();
  loadingSub.value = "正在备份深渊数据";
  await backupAbyssData(abyss);
  loadingSub.value = "";
  loading.value = false;
  showSnackbar({ text: "数据已备份!" });
}

// 恢复数据
async function confirmRestore(): Promise<void> {
  const resConfirm = await showConfirm({
    title: "确认恢复数据吗？",
    text: "请确保存在备份数据，祈愿数据恢复请到对应页面执行",
  });
  if (!resConfirm) {
    showSnackbar({
      color: "grey",
      text: "已取消恢复",
    });
    return;
  }
  loadingTitle.value = "正在恢复数据...";
  loading.value = true;
  const fail: string[] = [];
  let res: boolean;
  loadingSub.value = "正在恢复成就数据";
  res = await restoreUiafData();
  if (!res) {
    fail.push("成就数据");
  }
  loadingSub.value = "正在恢复祈愿数据";
  res = await restoreCookieData();
  if (!res) {
    fail.push("Cookie");
  }
  loadingSub.value = "正在恢复深渊数据";
  res = await restoreAbyssData();
  if (!res) {
    fail.push("深渊数据");
  }
  fail.length > 0
    ? showSnackbar({ text: `${fail.join("、")} 恢复失败!`, color: "error" })
    : showSnackbar({ text: "数据已恢复!" });
  loading.value = false;
}

// 更新数据
async function confirmUpdate(title?: string): Promise<void> {
  const res = await showConfirm({
    title: title ?? "确认更新数据吗？",
    text: "请确保存在备份数据",
  });
  if (!res) {
    showSnackbar({
      color: "grey",
      text: "已取消更新数据库",
    });
    return;
  }
  loadingTitle.value = "正在更新数据库...";
  loading.value = true;
  await TGSqlite.update();
  achievementsStore.lastVersion = await TGSqlite.getLatestAchievementVersion();
  loading.value = false;
  showSnackbar({
    text: "数据库已更新!",
  });
  // 刷新
  window.location.reload();
}

// 清除用户缓存
async function confirmDelUC(): Promise<void> {
  const res = await showConfirm({
    title: "确认清除用户缓存吗？",
    text: "备份数据也将被清除",
  });
  if (!res) {
    showSnackbar({
      color: "grey",
      text: "已取消清除用户缓存",
    });
    return;
  }
  await fs.removeDir("userData", {
    dir: fs.BaseDirectory.AppLocalData,
    recursive: true,
  });
  showSnackbar({ text: "用户数据已删除!" });
  achievementsStore.init();
  await fs.createDir("userData", { dir: fs.BaseDirectory.AppLocalData });
}

// 清除临时数据
async function confirmDelTemp(): Promise<void> {
  const res = await showConfirm({
    title: "确认清除临时数据吗？",
  });
  if (!res) {
    showSnackbar({
      color: "grey",
      text: "已取消清除临时数据",
    });
    return;
  }
  await fs.removeDir("tempData", {
    dir: fs.BaseDirectory.AppLocalData,
    recursive: true,
  });
  await fs.createDir("tempData", { dir: fs.BaseDirectory.AppLocalData });
  showSnackbar({ text: "临时数据已删除!" });
}

// 恢复默认设置
async function confirmResetApp(): Promise<void> {
  const res = await showConfirm({
    title: "确认恢复默认设置吗？",
  });
  if (!res) {
    showSnackbar({
      color: "grey",
      text: "已取消恢复默认设置",
    });
    return;
  }
  appStore.init();
  homeStore.init();
  achievementsStore.init();
  showSnackbar({ text: "已恢复默认配置!即将刷新页面..." });
  setTimeout(() => {
    window.location.reload();
  }, 1500);
}

// 重置数据库
async function confirmResetDB(title?: string): Promise<void> {
  const res = await showConfirm({
    title: title ?? "确认重置数据库吗？",
    text: "请确认已经备份关键数据",
  });
  if (!res) {
    showSnackbar({
      color: "grey",
      text: "已取消重置数据库",
    });
    return;
  }
  loadingTitle.value = "正在重置数据库...";
  loading.value = true;
  await TGSqlite.reset();
  loading.value = false;
  showSnackbar({
    text: "数据库已重置!请进行再次检查。",
  });
  setTimeout(() => {
    window.location.reload();
  }, 1500);
}

// 检测数据库完整性
async function confirmCheckDB(): Promise<void> {
  const resConfirm = await showConfirm({
    title: "确认检测数据库完整性吗？",
  });
  if (!resConfirm) {
    showSnackbar({
      color: "grey",
      text: "已取消检测",
    });
    return;
  }
  loadingTitle.value = "正在检查数据库表单完整性...";
  loading.value = true;
  const res = await TGSqlite.check();
  await new Promise((resolve) => setTimeout(resolve, 1000));
  if (!res) {
    loading.value = false;
    await confirmResetDB("数据库表单不完整，是否重置数据库？");
  } else {
    const appVersion = await app.getVersion();
    const dbVersion = dbInfo.value.find((item) => item.key === "appVersion")?.value;
    const dbUpdatedTime = dbInfo.value.find((item) => item.key === "dataUpdated")?.value;
    loading.value = false;
    if (!dbVersion || dbVersion < appVersion) {
      await confirmUpdate("数据库版本过低，是否更新数据库？");
      return;
    } else if (!buildTime.value.startsWith("dev")) {
      if (!dbUpdatedTime || dbUpdatedTime.startsWith("dev") || dbUpdatedTime < buildTime.value) {
        await confirmUpdate("数据库可能过时，是否更新数据库？");
        return;
      }
    }
    showSnackbar({
      text: "数据库已是最新!",
    });
  }
}

// 开启 dev 模式
function submitDevMode(): void {
  appStore.devMode
    ? showSnackbar({ text: "已关闭 dev 模式!" })
    : showSnackbar({ text: "已开启 dev 模式!" });
}

// 修改首页显示
function submitHome(): void {
  // 获取已选
  const show = showHome.value;
  if (show.length < 1) {
    showSnackbar({
      color: "error",
      text: "请至少选择一个!",
    });
    return;
  }
  // 设置
  homeStore.setShowValue(show);
  showSnackbar({ text: "已修改!" });
}
</script>

<style lang="css" scoped>
.config-list {
  border-radius: 10px;
  margin: 10px;
  background: var(--box-bg-1);
  color: var(--box-text-4);
  font-family: var(--font-text);
}

.config-header {
  margin-top: 10px;
  color: var(--common-text-title);
  font-family: Genshin, serif;
  font-size: large;
}

.config-icon {
  width: 40px;
  height: 40px;
  padding: 5px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 10px;
  margin-right: 15px;
  background: var(--box-bg-2);
}

.config-btn {
  width: 100px;
  margin-left: 20px;
  background: var(--tgc-btn-1);
  color: var(--btn-text);
}
</style>
