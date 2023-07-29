<template>
  <ToLoading v-model="loading" :title="loadingTitle" :subtitle="loadingSub" />
  <div class="tud-box">
    <div class="tud-top">
      <div class="tud-bt-quote">*数据刷新可能存在一定延迟，请以当前游戏实际数据为准</div>
      <div class="tud-bt-icon" @click="getDailyNotes">
        <v-icon>mdi-refresh</v-icon>
      </div>
    </div>
    <div class="tud-bottom">
      <div v-if="notes.max_resin" class="tud-bl-list">
        <TudTopList>
          <template #icon>
            <img src="/icon/material/106.webp" alt="resin" class="tud-bl-icon" />
          </template>
          <template #title>原粹树脂</template>
          <template #subtitle>将于 {{ notes.resin_recovery_time }} 后全部恢复</template>
          <template #rcontent> {{ notes.current_resin }}/{{ notes.max_resin }} </template>
        </TudTopList>
        <TudTopList>
          <template #icon>
            <img src="/icon/material/204.webp" alt="coin" class="tud-bl-icon" />
          </template>
          <template #title>洞天财瓮-洞天宝钱</template>
          <template #subtitle>将于 {{ notes.home_coin_recovery_time }} 后全部恢复</template>
          <template #rcontent> {{ notes.current_home_coin }}/{{ notes.max_home_coin }} </template>
        </TudTopList>
        <TudTopList>
          <template #icon>
            <img src="/icon/material/102.webp" alt="task" class="tud-bl-icon" />
          </template>
          <template #title>每日委托任务</template>
          <template #subtitle>
            {{
              notes.is_extra_reward_received ? "『每日委托』奖励已领取" : "『每日委托』奖励未领取"
            }}
          </template>
          <template #rcontent> {{ notes.finished_task_num }}/{{ notes.total_task_num }} </template>
        </TudTopList>
        <TudTopList>
          <template #icon>
            <img src="/icon/material/113021.webp" alt="boss" class="tud-bl-icon" />
          </template>
          <template #title>值得铭记的强敌</template>
          <template #subtitle>本周剩余消耗减半次数</template>
          <template #rcontent>
            {{ notes.remain_resin_discount_num }}/{{ notes.resin_discount_num_limit }}
          </template>
        </TudTopList>
        <TudTopList>
          <template #icon>
            <img src="/icon/material/220021.webp" alt="transform" class="tud-bl-icon" />
          </template>
          <template #title>参量质变仪</template>
          <template #subtitle>
            {{ notes.transformer.obtained ? "已准备完成" : "" }}
          </template>
          <template #rcontent>
            {{ notes.transformer.obtained ? "可使用" : "" }}
          </template>
        </TudTopList>
      </div>

      <div v-if="notes.max_resin" class="tud-bottom-list">
        <div class="tud-bt-title">
          <span>探索派遣限制（</span>
          <span>{{ notes.current_expedition_num }}/{{ notes.max_expedition_num }}</span>
          <span>）</span>
        </div>
        <div
          v-for="avatar in notes.expeditions"
          :key="avatar.remained_time"
          class="tud-expedition-item"
        >
          <div
            class="tud-avatar"
            :style="{
              borderRadius: '50%',
              border: avatar.status === 'finished' ? '3px solid #4caf50' : '3px solid #f44336',
            }"
          >
            <img :src="avatar.avatar_side_icon" alt="avatar" />
          </div>
          <div class="tud-ei-text">剩余探索时间：{{ avatar.remained_time }}</div>
        </div>
      </div>
    </div>
  </div>
  <ToConfirm
    v-model="confirmShow"
    v-model:model-input="confirmInput"
    :title="confirmTitle"
    subtitle="请输入返回结果"
    :is-input="true"
    @confirm="inputGeetest"
  />
  <v-snackbar v-model="snackbar" timeout="1500" :color="snackbarColor">
    {{ snackbarText }}
  </v-snackbar>
</template>
<script lang="ts" setup>
// vue
import { onMounted, ref } from "vue";
import ToLoading from "../overlay/to-loading.vue";
import ToConfirm from "../overlay/to-confirm.vue";
import TudTopList from "./tud-top-list.vue";
// store
import { useUserStore } from "../../store/modules/user";
// utils
import TGRequest from "../../web/request/TGRequest";
import { createTGWindow } from "../../utils/TGWindow";

// loading
const loading = ref<boolean>(true);
const loadingTitle = ref<string>("正在获取数据...");
const loadingSub = ref<string>("");

// confirm
const confirmShow = ref<boolean>(false);
const confirmTitle = ref<string>();
const confirmInput = ref<string>("");
// snackbar
const snackbar = ref<boolean>(false);
const snackbarColor = ref<string>("success");
const snackbarText = ref<string>();

// store
const userStore = useUserStore();

// data
const user = ref<TGApp.Sqlite.Account.Game>(<TGApp.Sqlite.Account.Game>{});
const notes = ref<TGApp.Game.DailyNotes.FullInfo>(<TGApp.Game.DailyNotes.FullInfo>{});
const geetest = ref<TGApp.BBS.Geetest.postData>({
  challenge: "",
  validate: "",
});

onMounted(() => {
  loadingTitle.value = "正在获取数据...";
  loadingSub.value = "";
  loading.value = true;
  user.value = userStore.getCurAccount();
  loading.value = false;
});

async function getDailyNotes(): Promise<void> {
  loadingTitle.value = "正在获取数据...";
  loadingSub.value = "";
  loading.value = true;
  const cookieGet = userStore.getCookieGroup4();
  const cookie = {
    account_id: cookieGet.account_id,
    cookie_token: cookieGet.cookie_token,
    ltoken: cookieGet.ltoken,
    ltuid: cookieGet.ltuid,
  };
  const res = await TGRequest.User.dailyNote.widget(cookie, user.value);
  if ("retcode" in res) {
    if (res.retcode === 1034) {
      loadingTitle.value = "检测到 1034 错误，需要进行极验验证";
      await doGeetest();
    } else {
      console.error(`[${res.retcode}] ${res.message}`);
      snackbarColor.value = "error";
      snackbarText.value = `[${res.retcode}] ${res.message}`;
      snackbar.value = true;
    }
  } else {
    snackbarColor.value = "success";
    snackbarText.value = "刷新成功";
    snackbar.value = true;
    notes.value = res;
  }
}

function openTest(res: TGApp.BBS.Geetest.getData): void {
  const url = `https://help.tencentbot.top/geetest2/?gt=${res.gt}&challenge=${res.challenge}`;
  createTGWindow(url, "geetest", "极验验证-完成验证后请复制结果并关闭窗口", 800, 600, true);
}

async function doGeetest(): Promise<void> {
  loadingTitle.value = "正在获取极验数据...";
  const cookieGet = userStore.getCookieGroup3();
  const cookie = {
    ltoken: cookieGet.ltoken,
    ltuid: cookieGet.ltuid,
  };
  const res = await TGRequest.User.dailyNote.getTest(cookie);
  if ("retcode" in res) {
    loading.value = false;
    console.error(`[${res.retcode}] ${res.message}`);
    snackbarColor.value = "error";
    snackbarText.value = `[${res.retcode}] ${res.message}`;
    snackbar.value = true;
  } else {
    geetest.value.challenge = res.challenge;
    loadingTitle.value = "成功获取极验数据";
    loadingSub.value = "请在新页面完成验证";
    setTimeout(() => {
      loading.value = false;
      openTest(res);
      confirmTitle.value = "请输入极验验证结果";
      confirmInput.value = "";
      confirmShow.value = true;
    }, 1000);
  }
}

async function inputGeetest(): Promise<void> {
  geetest.value.validate = confirmInput.value;
  const cookieGet = userStore.getCookieGroup4();
  const cookie = {
    ltoken: cookieGet.ltoken,
    ltuid: cookieGet.ltuid,
  };
  const res = await TGRequest.User.dailyNote.postRes(cookie, geetest.value);
  console.log(res);
}
</script>
<style lang="css" scoped>
.tud-box {
  display: flex;
  width: 600px;
  height: auto;
  flex-wrap: wrap;
  padding: 20px;
  border-radius: 5px;
  box-shadow: 0 0 10px var(--common-shadow-4);
  gap: 10px;
}

.tud-top {
  display: flex;
  width: 100%;
  height: 20px;
  align-items: center;
  justify-content: space-between;
}

.tud-bt-quote {
  height: 100%;
  color: var(--common-text-quote);
  font-size: 12px;
}

.tud-bt-icon {
  width: 20px;
  height: 20px;
  margin-right: 5px;
  color: var(--common-text-title);
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.tud-bt-icon:hover {
  animation: fresh-bt-icon 0.3s linear;
}

@keyframes fresh-bt-icon {
  0% {
    transform: rotate(0deg) scale(0.9);
  }

  50% {
    transform: rotate(180deg) scale(0.9);
  }

  100% {
    transform: rotate(360deg) scale(0.9);
  }
}

.tud-bottom {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
}

.tud-bl-list {
  display: flex;
  flex-wrap: wrap;
  background: transparent;
  gap: 5px;
}

.tud-bl-icon {
  width: 30px;
  height: 30px;
}

.tud-avatar {
  display: flex;
  width: 40px;
  height: 40px;
  justify-content: center;
  border: 6px solid;
}

.tud-avatar img {
  width: 130%;
  height: 130%;
  border-radius: 50%;
  transform: translateY(-10px);
}
</style>
