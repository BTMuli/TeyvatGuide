<!-- 米社用户切换菜单 -->
<template>
  <v-menu location="start">
    <template v-slot:activator="{ props: menuProps }">
      <div class="sign-user-switch" v-bind="menuProps">
        <span>{{ nickname }}({{ currentUid }})</span>
        <v-icon size="small">mdi-chevron-down</v-icon>
      </div>
    </template>
    <v-list>
      <v-list-item v-for="ac in users" :key="ac.uid">
        <v-list-item-title>{{ ac.brief.nickname }}</v-list-item-title>
        <v-list-item-subtitle>{{ ac.brief.uid }}</v-list-item-subtitle>
        <template #append>
          <div v-if="ac.uid === currentUid" title="当前登录账号">
            <v-icon color="green">mdi-account-check</v-icon>
          </div>
          <v-icon
            v-else
            size="small"
            icon="mdi-account-convert"
            title="切换用户"
            @click="switchUser(ac.uid)"
          />
        </template>
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<script lang="ts" setup>
import showSnackbar from "@comp/func/snackbar.js";
import TSUserAccount from "@Sqlm/userAccount.js";
import useUserStore from "@store/user.js";
import { storeToRefs } from "pinia";
import { onMounted, shallowRef } from "vue";

type Props = {
  nickname: string;
  currentUid: string;
};

type Emits = {
  (e: "switch-user", uid: string): void;
};

const props = defineProps<Props>();
const emits = defineEmits<Emits>();

const { uid, briefInfo, cookie, account } = storeToRefs(useUserStore());
const users = shallowRef<Array<TGApp.App.Account.User>>([]);

onMounted(async () => {
  await loadUsers();
});

async function loadUsers(): Promise<void> {
  users.value = await TSUserAccount.account.getAllAccount();
}

async function switchUser(targetUid: string): Promise<void> {
  if (targetUid === props.currentUid) {
    showSnackbar.warn("该账户已经登录，无需切换");
    return;
  }
  
  const accountGet = await TSUserAccount.account.getAccount(targetUid);
  if (!accountGet) {
    showSnackbar.warn(`未找到${targetUid}的账号信息，请重新登录`);
    return;
  }
  
  uid.value = targetUid;
  briefInfo.value = accountGet.brief;
  cookie.value = accountGet.cookie;
  
  const gameAccount = await TSUserAccount.game.getCurAccount(targetUid);
  if (!gameAccount) {
    showSnackbar.warn(`未找到${targetUid}的游戏账号信息，请尝试刷新`);
    return;
  }
  
  account.value = gameAccount;
  showSnackbar.success(`成功切换到用户${targetUid}`);
  
  emits("switch-user", targetUid);
}
</script>

<style lang="scss" scoped>
.sign-user-switch {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  user-select: none;

  &:hover {
    opacity: 0.8;
  }
}
</style>
