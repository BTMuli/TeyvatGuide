/**
 * HyperLink
 * @since Beta v0.9.2
 */

declare namespace TGApp.App.HyperLink {
  /**
   * 文件类型
   * @since Beta v0.9.2
   */
  type AppHyperLink = Array<HyperLinkItem>;

  /**
   * HyperLinkItem
   * @since Beta v0.9.2
   */
  type HyperLinkItem = {
    /** id */
    id: number;
    /** name */
    name: string;
    /**
     * 描述
     * @remarks htmlText
     */
    desc: string;
  };
}
