<template>
  <CpNotifications class="community-profile-panel" :category @read="notificationRead" />
</template>

<script lang="ts" setup>
import CpNotifications from "@comp/comiProf/cp-notifications.vue";
import { useCommunityProfile } from "@hooks/useCommunityProfile.js";

const { category } = defineProps<{ category: TGApp.BBS.Notification.Category }>();
const { notificationRead } = useCommunityProfile();
</script>
