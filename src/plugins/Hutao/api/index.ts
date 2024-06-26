/**
 * @file plugins Hutao api index.ts
 * @description Hutao API
 * @author BTMuli <bt-muli@outlook.com>
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
  UidCheckApi,
  UidRankApi,
  WeaponCollocationApi,
} from "./abyss.js";

const HutaoApi = {
  Abyss: {
    upload: DataUploadApi,
    user: {
      check: UidCheckApi,
      rank: UidRankApi,
    },
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
