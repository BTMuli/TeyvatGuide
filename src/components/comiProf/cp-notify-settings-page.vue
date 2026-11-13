<template>
  <CpNotifySettings class="community-profile-panel" @saved="notificationSettingsSaved" />
</template>

<script lang="ts" setup>
import CpNotifySettings from "@comp/comiProf/cp-notify-settings.vue";
import { useCommunityProfile } from "@hooks/useCommunityProfile.js";

const { notificationSettingsSaved } = useCommunityProfile();
</script>
