<template>
  <div class="tusm-box">
    <div class="tusm-top">
      <div class="tusm-title">米游币任务({{ todayPoints }}/{{ totalPoints }})</div>
      <div class="tusm-acts">
        <v-btn @click="tryRefresh()" class="tusm-btn" :loading="loadState">刷新</v-btn>
        <v-btn @click="tryAuto()" class="tusm-btn" :loading="loadMission">执行</v-btn>
      </div>
    </div>
    <div class="tusm-content">
      <div v-for="mission in parseMissions" :key="mission.id" class="mission-item">
        <div class="left">
          <v-icon v-if="!mission.status" color="var(--tgc-od-white)">mdi-circle</v-icon>
          <v-icon v-else color="var(--tgc-od-green)">mdi-checkbox-marked-circle-outline</v-icon>
          <span>{{ mission.name }} - {{ mission.reward }}米游币</span>
          <span v-if="mission.cycleTimes"> - Day{{ mission.cycleTimes }}</span>
        </div>
        <div class="right">
          <span>
            <v-progress-linear
              rounded
              :model-value="(mission.process / mission.total) * 100"
              height="8"
              color="var(--tgc-od-blue)"
            />
          </span>
          <span>{{ mission.process }}/{{ mission.total }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import showSnackbar from "@comp/func/snackbar.js";
import apiHubReq from "@req/apiHubReq.js";
import miscReq from "@req/miscReq.js";
import painterReq from "@req/painterReq.js";
import postReq from "@req/postReq.js";
import useUserStore from "@store/user.js";
import TGLogger from "@utils/TGLogger.js";
import { storeToRefs } from "pinia";
import { ref, shallowRef, watch } from "vue";

type ParseMission = {
  id: number;
  key: string;
  name: string;
  process: number;
  total: number;
  status: boolean;
  reward: number;
  cycleTimes?: number;
};

const { cookie, uid } = storeToRefs(useUserStore());
const loadScript = defineModel<boolean>();
const todayPoints = ref<number>(0);
const totalPoints = ref<number>(0);
const loadState = ref<boolean>(false);
const loadMission = ref<boolean>(false);
const parseMissions = shallowRef<Array<ParseMission>>([]);
const missionList = shallowRef<Array<TGApp.BBS.Mission.MissionItem>>([]);

defineExpose({ tryAuto });

watch(
  () => uid.value,
  () => {
    todayPoints.value = 0;
    totalPoints.value = 0;
    parseMissions.value = [];
    missionList.value = [];
  },
);

function mergeMission(
  list: Array<TGApp.BBS.Mission.MissionItem>,
  state: Array<TGApp.BBS.Mission.StateItem>,
): void {
  const res: Array<ParseMission> = [];
  for (const item of list) {
    const stateFind = state.find((i) => i.mission_id === item.id);
    if (!stateFind) {
      res.push({
        id: item.id,
        key: item.mission_key,
        name: item.name,
        process: 0,
        total: item.threshold,
        status: false,
        reward: item.points,
        cycleTimes: item.continuous_cycle_times === 0 ? undefined : item.continuous_cycle_times,
      });
      continue;
    }
    res.push({
      id: item.id,
      key: item.mission_key,
      name: item.name,
      total: item.threshold,
      process: stateFind.happened_times,
      status: stateFind.process === 1,
      reward: item.points,
      cycleTimes: item.continuous_cycle_times === 0 ? undefined : item.continuous_cycle_times,
    });
  }
  res.sort((a, b) => a.id - b.id);
  parseMissions.value = res;
}

async function tryRefresh(): Promise<void> {
  if (loadScript.value) {
    showSnackbar.warn("任务正在执行中，请稍后再试");
    return;
  }
  loadScript.value = true;
  loadState.value = true;
  await TGLogger.ScriptSep("米游币任务");
  await TGLogger.Script("[米游币任务]刷新任务状态");
  if (!cookie.value) {
    await TGLogger.Script("[米游币任务]未检测到Cookie");
    showSnackbar.warn("当前账号未登录，请先登录");
    await TGLogger.ScriptSep("米游币任务", false);
    return;
  }
  await refreshState(cookie.value);
  await TGLogger.ScriptSep("米游币任务", false);
  loadScript.value = false;
  loadState.value = false;
}

async function tryAuto(): Promise<void> {
  if (loadScript.value) {
    showSnackbar.warn("任务正在执行中，请稍后再试");
    return;
  }
  loadScript.value = true;
  loadMission.value = true;
  await TGLogger.ScriptSep("米游币任务");
  await TGLogger.Script("[米游币任务]开始执行任务");
  if (!cookie.value) {
    await TGLogger.Script("[米游币任务]未检测到Cookie");
    showSnackbar.warn("当前账号未登录，请先登录");
    await TGLogger.ScriptSep("米游币任务", false);
    return;
  }
  await refreshState(cookie.value);
  if (parseMissions.value.length === 0 || missionList.value.length === 0) {
    await TGLogger.ScriptSep("米游币任务", false);
    loadScript.value = false;
    loadMission.value = false;
    return;
  }
  await autoSign(cookie.value);
  const postFilter = parseMissions.value.filter((i) => i.key !== "continuous_sign");
  if (postFilter.every((i) => i.status)) {
    await TGLogger.Script("[米游币任务]所有任务已完成");
    await TGLogger.ScriptSep("米游币任务", false);
    loadScript.value = false;
    loadMission.value = false;
    return;
  }
  let isShare = false;
  let likeCnt = 0;
  let viewCnt = 0;
  const shareFind = postFilter.find((i) => i.key === "share_post_0");
  if (shareFind) isShare = shareFind.status;
  const likeFind = postFilter.find((i) => i.key === "post_up_0");
  if (likeFind) likeCnt = likeFind.process;
  const viewFind = postFilter.find((i) => i.key === "view_post_0");
  if (viewFind) viewCnt = viewFind.process;
  await TGLogger.Script("[米游币任务]获取帖子列表");
  const listResp = await painterReq.forum.recent(26, 2, 2, undefined, 20);
  const ckShare = { stoken: cookie.value.stoken, stuid: cookie.value.stuid, mid: cookie.value.mid };
  const ckPost = { ltoken: cookie.value.ltoken, ltuid: cookie.value.ltuid };
  for (const post of listResp.list) {
    if (!isShare) {
      await TGLogger.Script(`[米游币任务]正在分享帖子${post.post.post_id}`);
      const shareResp = await apiHubReq.post.share(post.post.post_id, ckShare);
      if (shareResp.retcode === 0) {
        await TGLogger.Script("[米游币任务]分享成功");
        isShare = true;
      } else {
        await TGLogger.Script(`[米游币任务]分享失败：${shareResp.retcode} ${shareResp.message}`);
      }
    }
    if (likeCnt < 5 || viewCnt < 3) {
      await TGLogger.Script(`[米游币任务]正在浏览帖子${post.post.post_id}`);
      const detailResp = await postReq.post(post.post.post_id, ckPost);
      if ("retcode" in detailResp) {
        await TGLogger.Script(
          `[米游币任务]获取帖子${post.post.post_id}失败：${detailResp.retcode} ${detailResp.message}`,
        );
        continue;
      }
      viewCnt++;
      if (likeCnt < 5) {
        const isLike = detailResp.self_operation.upvote_type === 1;
        if (isLike) {
          await TGLogger.Script(`[米游币任务]帖子${post.post.post_id}已点赞，跳过`);
          continue;
        }
        await TGLogger.Script(`[米游币任务]正在点赞帖子${post.post.post_id}`);
        const likeResp = await apiHubReq.post.like(post.post.post_id, ckPost);
        if (likeResp.retcode === 0) {
          await TGLogger.Script("[米游币任务]点赞成功");
          likeCnt++;
        } else {
          await TGLogger.Script(`[米游币任务]点赞失败：${likeResp.retcode} ${likeResp.message}`);
          continue;
        }
        await TGLogger.Script(`[米游币任务]正在取消点赞帖子${post.post.post_id}`);
        await new Promise<void>((resolve) => setTimeout(resolve, 1000));
        const unlikeResp = await apiHubReq.post.like(post.post.post_id, ckPost, true);
        if (unlikeResp.retcode === 0) {
          await TGLogger.Script("[米游币任务]取消点赞成功");
        } else {
          await TGLogger.Script(
            `[米游币任务]取消点赞失败：${unlikeResp.retcode} ${unlikeResp.message}`,
          );
        }
      }
    }
    if (isShare && likeCnt >= 5 && viewCnt >= 3) {
      await TGLogger.Script("[米游币任务]所有任务已完成");
      break;
    }
  }
  await TGLogger.Script("[米游币任务]任务执行完毕，即将刷新任务状态");
  await refreshState(cookie.value);
  await TGLogger.ScriptSep("米游币任务", false);
  loadScript.value = false;
  loadMission.value = false;
}

async function refreshState(ck: TGApp.App.Account.Cookie): Promise<void> {
  const ckState = { cookie_token: ck.cookie_token, account_id: ck.account_id };
  await TGLogger.Script("[米游币任务]刷新任务状态");
  if (missionList.value.length === 0) {
    await TGLogger.Script("[米游币任务]未检测到任务列表，正在获取");
    const listResp = await apiHubReq.mission.list(ckState);
    if (listResp.retcode !== 0) {
      await TGLogger.Script(
        `[米游币任务]获取任务列表失败：${listResp.retcode} ${listResp.message}`,
      );
      showSnackbar.error(`[${listResp.retcode}] ${listResp.message}`);
      return;
    }
    missionList.value = listResp.data.missions;
    await TGLogger.Script("[米游币任务]获取任务列表成功");
  }
  await TGLogger.Script("[米游币任务]正在获取任务状态");
  const stateResp = await apiHubReq.mission.state(ckState);
  if (stateResp.retcode !== 0) {
    await TGLogger.Script(
      `[米游币任务]获取任务状态失败：${stateResp.retcode} ${stateResp.message}`,
    );
    showSnackbar.error(`[${stateResp.retcode}] ${stateResp.message}`);
    return;
  }
  await TGLogger.Script("[米游币任务]获取任务状态成功");
  todayPoints.value = stateResp.data.already_received_points;
  totalPoints.value = stateResp.data.today_total_points;
  await TGLogger.Script("[米游币任务]合并任务数据");
  mergeMission(missionList.value, stateResp.data.states);
  await TGLogger.Script("[米游币任务]任务数据合并完成");
}

async function autoSign(ck: TGApp.App.Account.Cookie, ch?: string): Promise<void> {
  const signFind = parseMissions.value.find((i) => i.key === "continuous_sign");
  if (!signFind) {
    await TGLogger.Script("[米游币任务]未找到打卡任务");
    return;
  }
  if (signFind.status) {
    await TGLogger.Script("[米游币任务]今日已打卡");
    return;
  }
  await TGLogger.Script("[米游币任务]正在执行打卡");
  const ckSign = { stoken: ck.stoken, stuid: ck.stuid, mid: ck.mid };
  const resp = await apiHubReq.sign(ckSign, 2, ch);
  if (resp.retcode !== 0) {
    if (resp.retcode !== 1034) {
      await TGLogger.Script(`[米游币任务]打卡失败：${resp.retcode} ${resp.message}`);
      showSnackbar.error(`[${resp.retcode}] ${resp.message}`);
      return;
    }
    await TGLogger.Script(`[米游币任务]社区签到触发验证码，正在尝试验证`);
    const challenge = await miscReq.challenge(ckSign);
    if (challenge === false) {
      await TGLogger.Script(`[米游币任务]验证失败`);
      return;
    }
    await autoSign(ck, challenge);
    return;
  }
  await TGLogger.Script("[米游币任务]打卡成功");
}
</script>
<style lang="scss" scoped>
.tusm-box {
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

.tusm-top {
  position: relative;
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tusm-title {
  font-family: var(--font-title);
  font-size: 18px;
}

.tusm-acts {
  display: flex;
  gap: 8px;
}

.tusm-btn {
  background: var(--tgc-btn-1);
  color: var(--btn-text);
}

.tusm-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mission-item {
  position: relative;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px;
  background: var(--box-bg-2);
  border-radius: 4px;
  color: var(--box-text-2);

  .left {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .right {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;

    :first-child {
      width: 100px;
    }
  }
}
</style>
