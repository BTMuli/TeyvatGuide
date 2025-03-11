<template>
  <div class="tuss-box">
    <div class="tuss-top">
      <div class="tuss-title">签到任务</div>
      <div class="tuss-acts">
        <v-btn @click="tryRefresh()" class="tuss-btn" :loading="loadState">刷新</v-btn>
        <v-btn @click="tryAuto()" class="tuss-btn" :loading="loadSign">执行</v-btn>
      </div>
    </div>
    <div class="tuss-content">
      <div
        v-for="(item, idx) in signAccounts"
        :key="idx"
        @click="item.selected = !item.selected"
        :class="{ selected: item.selected }"
        class="tuss-item"
      >
        <v-icon v-if="item.selected" color="var(--tgc-od-blue)">
          mdi-checkbox-marked-outline
        </v-icon>
        <v-icon v-else color="var(--tgc-od-white)">mdi-checkbox-blank-outline</v-icon>
        <div class="tuss-account">
          <div class="tuss-icon">
            <img :src="item.info.icon" alt="icon" />
            <div
              class="delete"
              v-if="item.account.gameBiz !== 'hk4e_cn'"
              @click.stop="deleteAccount(item)"
              title="删除账户"
            >
              <v-icon size="12" color="var(--tgc-od-red)">mdi-delete</v-icon>
            </div>
          </div>
          <span>{{ item.account.gameUid }} {{ item.account.regionName }}</span>
        </div>
        <div class="tuss-stat">
          <div
            class="tuss-reward"
            v-if="item.reward"
            :title="`${item.reward.name}x${item.reward.cnt}`"
          >
            <TMiImg :src="item.reward.icon" alt="icon" :ori="true" />
            <span>{{ item.reward.cnt }}</span>
          </div>
          <v-icon v-if="item.stat?.is_sign" color="var(--tgc-od-green)" title="已签到">
            mdi-checkbox-marked-circle-outline
          </v-icon>
          <v-icon v-else color="var(--tgc-od-white)" title="未签到">mdi-circle</v-icon>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import TMiImg from "@comp/app/t-mi-img.vue";
import showDialog from "@comp/func/dialog.js";
import showGeetest from "@comp/func/geetest.js";
import showSnackbar from "@comp/func/snackbar.js";
import TSUserAccount from "@Sqlite/modules/userAccount.js";
import { storeToRefs } from "pinia";
import { onMounted, ref, shallowRef, watch } from "vue";

import { useUserStore } from "@/store/modules/user.js";
import TGLogger from "@/utils/TGLogger.js";
import lunaReq from "@/web/request/lunaReq.js";
import miscReq from "@/web/request/miscReq.js";
import takumiReq from "@/web/request/takumiReq.js";

type SignGameInfo = { title: string; icon: string; gid: number };
type SignAccount = {
  selected: boolean;
  account: TGApp.Sqlite.Account.Game;
  info: SignGameInfo;
  stat?: TGApp.BBS.Sign.InfoRes;
  reward?: TGApp.BBS.Sign.HomeAward;
};

const { cookie, uid } = storeToRefs(useUserStore());
const loadScript = defineModel<boolean>();
const loadState = ref<boolean>(false);
const loadSign = ref<boolean>(false);
const signAccounts = ref<Array<SignAccount>>([]);
const gameAccounts = shallowRef<Array<TGApp.Sqlite.Account.Game>>([]);

watch(
  () => uid.value,
  async () => await loadData(),
);

onMounted(async () => await loadData());

function getGameInfo(biz: string): SignGameInfo {
  switch (biz) {
    // 崩坏2
    case "bh2_cn":
      return { title: "崩坏2", icon: "/platforms/mhy/bh2.webp", gid: 3 };
    // 崩坏3
    case "bh3_cn":
      return { title: "崩坏3", icon: "/platforms/mhy/bh3.webp", gid: 1 };
    // 原神
    case "hk4e_cn":
      return { title: "原神", icon: "/platforms/mhy/ys.webp", gid: 2 };
    // 崩坏：星穹铁道
    case "hkrpg_cn":
      return { title: "崩坏：星穹铁道", icon: "/platforms/mhy/sr.webp", gid: 6 };
    // 未定事件簿
    case "nxx_cn":
      return { title: "未定事件簿", icon: "/platforms/mhy/wd.webp", gid: 4 };
    // 绝区零
    case "nap_cn":
      return { title: "绝区零", icon: "/platforms/mhy/zzz.webp", gid: 8 };
    default:
      return { title: biz, icon: "/platforms/mhy/mys.webp", gid: 0 };
  }
}

async function loadData(): Promise<void> {
  gameAccounts.value = [];
  signAccounts.value = [];
  if (uid.value === undefined) return;
  gameAccounts.value = await TSUserAccount.game.getAccount(uid.value);
  for (const ac of gameAccounts.value) {
    const info = getGameInfo(ac.gameBiz);
    signAccounts.value.push({ selected: true, account: ac, info });
  }
}

async function deleteAccount(item: SignAccount): Promise<void> {
  if (item.account.gameBiz === "hk4e_cn") {
    showSnackbar.warn("原神账户不可删除");
    return;
  }
  const idx = signAccounts.value.findIndex((i) => i === item);
  if (idx === -1) return;
  const infoStr = `${item.info.title}-${item.account.regionName}-${item.account.gameUid}`;
  const check = await showDialog.check(`确定删除?`, `${infoStr}\n删除后仅能通过刷新游戏账号恢复`);
  if (!check) {
    showSnackbar.cancel(`已取消删除${infoStr}`);
    return;
  }
  await TSUserAccount.game.deleteAccount(item.account);
  signAccounts.value.splice(idx, 1);
  showSnackbar.success(`已删除${infoStr}`);
}

async function tryRefresh(): Promise<void> {
  if (loadScript.value) {
    showSnackbar.warn("任务正在执行中，请稍后再试");
    return;
  }
  loadScript.value = true;
  loadState.value = true;
  await TGLogger.ScriptSep("签到任务");
  await TGLogger.Script("[签到任务]刷新账户");
  if (!cookie.value) {
    await TGLogger.Script("[签到任务]未检测到Cookie");
    showSnackbar.warn("当前账户未登录，请先登录");
    await TGLogger.ScriptSep("签到任务", false);
    loadState.value = false;
    loadScript.value = false;
    return;
  }
  await refreshState(cookie.value);
  await TGLogger.Script(`[签到任务]刷新账户成功，成功获取${signAccounts.value.length}个账户`);
  await TGLogger.ScriptSep("签到任务", false);
  loadScript.value = false;
  loadState.value = false;
}

async function tryAuto(): Promise<void> {
  if (loadScript.value) {
    showSnackbar.warn("任务正在执行中，请稍后再试");
    return;
  }
  loadScript.value = true;
  loadSign.value = true;
  await TGLogger.ScriptSep("签到任务");
  await TGLogger.Script("[签到任务]执行签到");
  if (!cookie.value) {
    await TGLogger.Script("[签到任务]未检测到Cookie");
    showSnackbar.warn("当前账户未登录，请先登录");
    await TGLogger.ScriptSep("签到任务", false);
    loadScript.value = false;
    loadSign.value = false;
    return;
  }
  if (signAccounts.value.length === 0 || signAccounts.value.some((i) => i.stat === undefined)) {
    await TGLogger.Script("[签到任务]未检测到游戏账户或签到状态，正在刷新");
    await refreshState(cookie.value);
  }
  const selected = signAccounts.value.filter((i) => i.selected);
  if (selected.length === 0) {
    await TGLogger.Script("[签到任务]未选择任何账户");
    showSnackbar.warn("未选择任何账户");
    await TGLogger.ScriptSep("签到任务", false);
    loadScript.value = false;
    loadSign.value = false;
    return;
  }
  await trySign(selected, cookie.value);
  await refreshState(cookie.value);
  await TGLogger.Script("[签到任务]签到任务执行完毕");
  await TGLogger.ScriptSep("签到任务", false);
  loadScript.value = false;
  loadSign.value = false;
}

async function refreshState(ck: TGApp.App.Account.Cookie): Promise<void> {
  if (uid.value === undefined) return;
  await TGLogger.Script("[签到任务]刷新签到状态");
  if (signAccounts.value.length === 0) {
    await TGLogger.Script("[签到任务]未检测到游戏账户，正在获取");
    const gameResp = await takumiReq.bind.gameRoles(ck);
    if (Array.isArray(gameResp)) {
      await TGLogger.Script("[签到任务]获取游戏账户成功");
      await TSUserAccount.game.saveAccounts(uid.value, gameResp);
      gameAccounts.value = await TSUserAccount.game.getAccount(uid.value);
      for (const ac of gameAccounts.value) {
        const info = getGameInfo(ac.gameBiz);
        const find = signAccounts.value.find((i) => i.account === ac);
        if (find) continue;
        signAccounts.value.push({ selected: true, account: ac, info });
      }
    } else {
      await TGLogger.Script(`[签到任务]获取游戏账户失败:${gameResp.retcode} ${gameResp.message}`);
      showSnackbar.error(`[${gameResp.retcode}] ${gameResp.message}`);
      return;
    }
  }
  const cookie = { cookie_token: ck.cookie_token, account_id: ck.account_id };
  const dayNow = new Date().getDate();
  for (const item of signAccounts.value) {
    await TGLogger.Script(
      `[签到任务]刷新${item.info.title}-${item.account.regionName}-${item.account.gameUid}`,
    );
    if (item.reward === undefined) {
      const rewardResp = await lunaReq.home(item.account, cookie);
      if ("retcode" in rewardResp) {
        await TGLogger.Script(
          `[签到任务]获取签到奖励失败:${rewardResp.retcode} ${rewardResp.message}`,
        );
        showSnackbar.error(`[${rewardResp.retcode}] ${rewardResp.message}`);
      } else item.reward = rewardResp.awards[dayNow - 1];
    }
    const statResp = await lunaReq.info(item.account, cookie);
    if ("retcode" in statResp) {
      await TGLogger.Script(`[签到任务]获取签到状态失败:${statResp.retcode} ${statResp.message}`);
      showSnackbar.error(`[${statResp.retcode}] ${statResp.message}`);
    } else item.stat = statResp;
  }
}

async function trySign(ac: SignAccount[], ck: TGApp.App.Account.Cookie): Promise<void> {
  const cookie = { cookie_token: ck.cookie_token, account_id: ck.account_id };
  const ckSign = { stoken: ck.stoken, stuid: ck.stuid, mid: ck.mid };
  for (const item of ac) {
    if (item.stat?.is_sign) {
      await TGLogger.Script(
        `[签到任务]${item.info.title}-${item.account.regionName}-${item.account.gameUid}已签到`,
      );
      continue;
    }
    let check = false;
    let challenge: string | undefined = undefined;
    while (!check) {
      const signResp = await lunaReq.sign(item.account, cookie, challenge);
      if (challenge !== undefined) challenge = undefined;
      if ("retcode" in signResp) {
        if (signResp.retcode === 1034) {
          await TGLogger.Script(`[签到任务]触发验证码，正在尝试验证`);
          const challengeGet = await miscReq.challenge(ckSign);
          if (challengeGet === false) {
            await TGLogger.Script("[签到任务]验证码验证失败");
            break;
          }
          challenge = challengeGet;
          continue;
        }
        await TGLogger.Script(`[签到任务]签到失败:${signResp.retcode} ${signResp.message}`);
        showSnackbar.error(`[${signResp.retcode}] ${signResp.message}`);
        break;
      }
      if (signResp.success === 0) check = true;
      else if (signResp.is_risk) {
        await TGLogger.Script("[签到任务]触发风险验证，开始验证");
        const gtRes = await showGeetest({
          gt: signResp.gt,
          challenge: signResp.challenge,
          new_captcha: 1,
          success: 1,
        });
        if (gtRes === false) {
          await TGLogger.Script("[签到任务]验证码验证失败");
          break;
        }
        challenge = signResp.challenge;
      } else break;
    }
    if (check) {
      await TGLogger.Script(
        `[签到任务]${item.info.title}-${item.account.regionName}-${item.account.gameUid}签到成功`,
      );
    } else {
      await TGLogger.Script(
        `[签到任务]${item.info.title}-${item.account.regionName}-${item.account.gameUid}签到失败，请重试`,
      );
    }
  }
}
</script>
<style lang="scss" scoped>
.tuss-box {
  position: relative;
  width: 100%;
  box-sizing: border-box;
  padding: 12px;
  background: var(--box-bg-1);
  border-radius: 4px;
  border: 1px solid var(--common-shadow-2);
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: var(--box-text-1);
}

.tuss-top {
  position: relative;
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tuss-title {
  font-family: var(--font-title);
  font-size: 18px;
}

.tuss-acts {
  display: flex;
  gap: 8px;
}

.tuss-btn {
  background: var(--tgc-btn-1);
  color: var(--btn-text);
}

.tuss-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tuss-item {
  position: relative;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  column-gap: 8px;
  padding: 10px;
  background: var(--box-bg-2);
  border-radius: 4px;
  color: var(--box-text-2);
  height: 80px;
  cursor: pointer;
  user-select: none;

  &:hover {
    background: var(--box-bg-3);
    border: 1px solid var(--common-shadow-1);
  }
}

.tuss-account {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 4px;
}

.tuss-icon {
  position: relative;
  width: 48px;
  height: 48px;
  border-radius: 4px;
  overflow: hidden;

  img {
    border-radius: 4px;
    width: 100%;
    height: 100%;
  }

  .delete {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(5px);
    border-top-right-radius: 8px;
    cursor: pointer;
  }
}

.tuss-stat {
  position: relative;
  margin-left: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 4px;
}

.tuss-reward {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--box-bg-4);

  img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    padding: 10px;
    box-sizing: border-box;
    border: 1px solid var(--common-shadow-1);
  }

  span {
    position: absolute;
    bottom: 0;
    width: fit-content;
    min-width: 48px;
    padding: 0 4px;
    border-radius: 12px;
    font-size: 8px;
    text-align: center;
    background: var(--app-page-bg);
    border: 1px solid var(--common-shadow-1);
  }
}
</style>
