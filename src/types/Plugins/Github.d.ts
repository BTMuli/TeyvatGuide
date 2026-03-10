/**
 * Github API 类型
 * @since Beta v0.9.8
 */

declare namespace TGApp.Plugins.Github {
  /**
   * LatestReleaseResponse
   * @since Beta v0.9.8
   * @see https://api.github.com/repos/BTMuli/TeyvatGuide/releases/latest
   * @remarks 省略了不需要的子数据
   */
  type LastestReleaseResp = {
    /** URL */
    url: string;
    /** Assets URL */
    assets_url: string;
    /** Upload URL */
    upload_url: string;
    /** Html URL */
    html_url: string;
    /** Release ID */
    id: number;
    /** Author */
    author: unknown;
    /** Node ID */
    node_id: string;
    /** Tag */
    tag_name: string;
    /** Commit Hash */
    target_commitish: string;
    /** Release Name */
    name: string;
    /** Draft */
    draft: boolean;
    /** Immutable */
    immutable: boolean;
    /** PreRelease */
    prerelease: boolean;
    /**
     * CreateTime
     * @example 2026-02-26T10:33:04Z
     */
    created_at: string;
    /**
     * UpdateTime
     * @example 2026-02-27T08:53:27Z
     */
    updated_at: string;
    /**
     * PublishTime
     * @example 2026-02-27T08:53:27Z
     */
    published_at: string;
    /** Assets */
    assets: Array<unknown>;
    /** Tarball URL */
    tarball_url: string;
    /** Zipball URL */
    zipball_url: string;
    /** Release Body */
    body: string;
  };
}
