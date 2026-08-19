/**
 * 游戏安装与客户端方案类型。
 * @since Beta v0.11.5
 */

declare namespace TGApp.Game.Installation {
  /** 支持的国服客户端方案。 */
  const Scheme = <const>{
    CN_OFFICIAL: "cn_official",
    CN_BILIBILI: "cn_bilibili",
  };

  /** 支持的国服客户端方案值。 */
  type SchemeEnum = (typeof Scheme)[keyof typeof Scheme];

  /** 安装检测状态。 */
  const Status = <const>{
    KNOWN: "known",
    UNSUPPORTED: "unsupported",
    INCONSISTENT: "inconsistent",
  };

  /** 安装检测状态值。 */
  type StatusEnum = (typeof Status)[keyof typeof Status];

  /** 已登记安装及其最新磁盘检测结果。 */
  type Item = {
    /** 稳定安装 ID。 */
    id: string;
    /** 规范化后的可执行文件路径。 */
    executablePath: string;
    /** 游戏根目录。 */
    rootPath: string;
    /** 当前磁盘识别出的方案。 */
    schemeId: SchemeEnum | null;
    /** 用户上次选定的目标方案。 */
    preferredScheme: SchemeEnum | null;
    /** 检测状态。 */
    status: StatusEnum;
    /** 可展示的检测说明。 */
    statusMessage: string;
    /** 本地游戏版本。 */
    version: string | null;
    /** config.ini channel。 */
    channel: number | null;
    /** config.ini sub_channel。 */
    subChannel: number | null;
    /** 是否存在渠道 SDK。 */
    hasChannelSdk: boolean;
    /** 已安装语音语言。 */
    audioLanguages: Array<string>;
    /** 是否为当前安装。 */
    isChosen: boolean;
    /** 最近一次成功记录时间。 */
    lastSeen: string;
  };
}
