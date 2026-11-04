/**
 * 帖子视频播放类型声明文件
 * @since Beta v0.13.0
 */
declare namespace TGApp.BBS.PostVod {
  /**
   * 视频播放器实际消费的分辨率字段。
   * @since Beta v0.13.0
   */
  type Resolution = {
    url: string;
    width: number;
    height: number;
    size: number;
    label: string;
    format: string;
  };
}
