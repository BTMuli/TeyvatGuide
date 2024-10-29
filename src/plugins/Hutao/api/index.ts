/**
 * @file plugins/Hutao/api/index.ts
 * @description Hutao API
 * @since Alpha v0.2.0
 */

import {
  AvatarCollocationApi,
  AvatarHoldRateApi,
  AvatarUpRateApi,
  AvatarUseRateApi,
  DataUploadApi,
  OverviewApi,
  TeamCombinationApi,
  WeaponCollocationApi,
} from "./abyss.js";

const HutaoApi = {
  Abyss: {
    upload: DataUploadApi,
    overview: OverviewApi,
    avatar: {
      upRate: AvatarUpRateApi,
      useRate: AvatarUseRateApi,
      holdRate: AvatarHoldRateApi,
      collect: AvatarCollocationApi,
    },
    weapon: WeaponCollocationApi,
    team: TeamCombinationApi,
  },
};

export default HutaoApi;
