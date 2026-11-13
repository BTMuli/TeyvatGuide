<template>
  <CpContent class="community-profile-panel" :profileUid :section />
</template>

<script lang="ts" setup>
import CpContent from "@comp/comiProf/cp-content.vue";
import { useCommunityProfile } from "@hooks/useCommunityProfile.js";

const { section } = defineProps<{ section: TGApp.BBS.Profile.ContentSection }>();
const { profileUid } = useCommunityProfile();
</script>
