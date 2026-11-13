/**
 * 社区个人中心的路由栏目与共享布局上下文。
 * @since Beta v0.13.1
 */

declare namespace TGApp.BBS.Profile {
  /**
   * 个人中心栏目。
   * @since Beta v0.13.1
   */
  type Section =
    | "posts"
    | "comments"
    | "collections"
    | "favorites"
    | "following"
    | "followers"
    | "history"
    | "privacy"
    | "edit"
    | "reply"
    | "mention"
    | "system"
    | "likes"
    | "notifySettings";

  /**
   * 共用内容列表面板的栏目。
   * @since Beta v0.13.1
   */
  type ContentSection = Extract<
    Section,
    "comments" | "collections" | "favorites" | "following" | "followers" | "history"
  >;

  /**
   * 资料和隐私设置面板的栏目。
   * @since Beta v0.13.1
   */
  type SettingsSection = Extract<Section, "privacy" | "edit">;

  /**
   * 个人中心分区选择和帖子卡片使用的游戏信息。
   * @since Beta v0.13.1
   */
  type GameOption = Pick<TGApp.BBS.Game.Item, "id" | "name"> & {
    icon?: string;
  };

  /**
   * 由个人中心布局提供给路由面板的资料与更新操作。
   * @since Beta v0.13.1
   */
  type Context = {
    profileUid: Readonly<import("vue").Ref<string>>;
    isOwnProfile: Readonly<import("vue").Ref<boolean>>;
    canViewProfile: Readonly<import("vue").Ref<boolean>>;
    profile: Readonly<import("vue").Ref<TGApp.BBS.User.Info | undefined>>;
    profileAudit: Readonly<import("vue").Ref<TGApp.BBS.User.InfoRes["audit_info"] | undefined>>;
    selectedGid: Readonly<import("vue").Ref<number>>;
    gameOptions: Readonly<import("vue").Ref<Array<GameOption>>>;
    currentGame: Readonly<import("vue").Ref<GameOption>>;
    refreshProfile: () => Promise<void>;
    adjustPostCount: (delta: number) => void;
    settingsSaved: (section: SettingsSection, warning?: string) => void;
    notificationRead: (category: TGApp.BBS.Notification.Category) => void;
    notificationSettingsSaved: (settings: TGApp.BBS.Notification.Settings) => void;
  };
}
