export type UserCalcCharacterOption = {
  title: string;
  value: number;
};

export type UserCalcWeaponOption = {
  key: string;
  title: string;
  wiki: TGApp.App.Weapon.WikiItem;
  level: number;
  promoteLevel: number;
  affixLevel: number;
  fromBag: boolean;
  locked: boolean;
  guid?: string;
};

export type UserCalcResultMaterial = {
  id: number;
  name: string;
  type: string;
  star: number;
  required: number;
  owned: number;
  missing: number;
  progress: number;
};
