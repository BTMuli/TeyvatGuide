/**
 * @file plugins/Mys/types/SctPost.d.ts
 * @description Mys 插件 结构化帖子类型声明文件
 * @todo 完善类型
 * @since Beta v0.3.4
 */

/**
 * @description 结构化帖子类型命名空间
 * @since Beta v0.3.4
 * @namespace TGApp.Plugins.Mys.SctPost
 * @memberof TGApp.Plugins.Mys
 */
declare namespace TGApp.Plugins.Mys.SctPost {
  /**
   * @description 帖子结构化数据-基础类型
   * @since Beta v0.3.4
   * @interface Base
   * @property {unknown} insert - 帖子内容
   * @property {unknown} attributes - 帖子属性
   * @return Base
   */
  interface Base {
    insert: any;
    attributes?: any;
  }

  /**
   * @description 帖子结构化数据-空类型
   * @since Beta v0.3.4
   * @interface Empty
   * @property {never} insert - 帖子内容
   * @property {never} attributes - 帖子属性
   * @return Empty
   */
  interface Empty {
    insert: never;
    attributes?: never;
  }

  /**
   * @description 帖子结构化数据-联合类型
   * @since Beta v0.3.4
   * @interface Common
   * @return Common
   */
  type Common =
    | Backup
    | Divider
    | Image
    | Link
    | LinkCard
    | Mention
    | Text
    | Video
    | VillaCard
    | Vod
    | Empty;

  /**
   * @description 帖子结构化数据-其他类型
   * @since Beta v0.3.4
   * @property {string} describe - 描述
   * @property {string[]} imgs - 图片链接
   * @return Other
   */
  interface Other {
    describe: string;
    imgs: string[];
    [key: string]: unknown;
  }

  /**
   * @description 帖子结构化数据-折叠文本
   * @since Beta v0.3.4
   * @interface Backup
   * @extends Base
   * @property {string} insert.backup_text - 折叠文本
   * @property {string} insert.fold.title - 折叠标题
   * @property {string} insert.fold.content - 折叠内容
   * @return Backup
   */
  interface Backup extends Base {
    insert: {
      backup_text: string;
      fold: {
        title: string;
        content: string;
      };
    };
  }

  /**
   * @description 帖子结构化数据-分割线
   * @since Beta v0.3.4
   * @interface Divider
   * @extends Base
   * @property {string} insert.divider - 分割线
   * @return Divider
   */
  interface Divider extends Base {
    insert: {
      divider: string;
    };
  }

  /**
   * @description 帖子结构化数据-图片类型
   * @since Beta v0.3.4
   * @interface Image
   * @extends Base
   * @property {string} insert.image - 图片链接
   * @property {number} attributes.width - 图片宽度
   * @property {number} attributes.height - 图片高度
   * @property {number} [attributes.size] - 图片大小
   * @property {string} [attributes.ext] - 图片格式
   * @return Image
   */
  interface Image extends Base {
    insert: {
      image: string;
    };
    attributes?: {
      width: number;
      height: number;
      size: number | undefined;
      ext: string | undefined;
    };
  }

  /**
   * @description 帖子结构化数据-文本链接
   * @since Beta v0.3.4
   * @interface Link
   * @extends Base
   * @property {string} insert - 帖子内容
   * @property {string} attributes.link - 链接
   * @return Link
   */
  interface Link extends Base {
    insert: string;
    attributes: {
      link: string;
    };
  }

  /**
   * @description 帖子结构化数据-链接卡片
   * @since Beta v0.3.4
   * @interface LinkCard
   * @extends Base
   * @property {number} insert.link_card.link_type - 链接类型
   * @property {string} insert.link_card.origin_url - 原始链接
   * @property {string} insert.link_card.landing_url - 落地页链接
   * @property {string} insert.link_card.cover - 封面
   * @property {string} insert.link_card.title - 标题
   * @property {string} insert.link_card.card_id - 卡片ID
   * @property {number} insert.link_card.card_status - 卡片状态
   * @property {string} insert.link_card.market_price - 市场价
   * @property {string} insert.link_card.price - 价格
   * @property {string} insert.link_card.button_text - 按钮文本
   * @property {number} insert.link_card.landing_url_type - 落地页类型
   * @return LinkCard
   */
  interface LinkCard extends Base {
    insert: {
      link_card: {
        link_type: number;
        origin_url: string;
        landing_url: string;
        cover: string;
        title: string;
        card_id: string;
        card_status: number;
        market_price: string;
        price?: string;
        button_text?: string;
        landing_url_type: number;
      };
    };
  }

  /**
   * @description 帖子结构化数据-抽奖
   * @since Beta v0.3.4
   * @interface Lottery
   * @extends Base
   * @property {"[抽奖]"} insert.backup_text - 抽奖文本
   * @property {string} insert.lottery.id - 抽奖ID
   * @property {string} insert.lottery.toast - 抽奖提示
   * @return Lottery
   */
  interface Lottery extends Base {
    insert: {
      backup_text: "[抽奖]";
      lottery: {
        id: string;
        toast: string;
      };
    };
  }

  /**
   * @description 帖子结构化数据-提及用户
   * @since Beta v0.3.4
   * @interface Mention
   * @extends Base
   * @property {string} insert.mention.uid - 用户ID
   * @property {string} insert.mention.nickname - 用户昵称
   * @return Mention
   */
  interface Mention extends Base {
    insert: {
      mention: {
        uid: string;
        nickname: string;
      };
    };
  }

  /**
   * @description 帖子结构化数据-文本类型
   * @since Beta v0.3.4
   * @interface Text
   * @extends Base
   * @property {string} insert - 帖子内容
   * @property {boolean} [attributes.bold] - 是否加粗
   * @property {string} [attributes.color] - 文本颜色
   * @property {string} [attributes.link] - 链接
   * @return Text
   */
  interface Text extends Base {
    insert: string;
    attributes?: {
      bold?: boolean;
      color?: string;
      align?: string;
    };
  }

  /**
   * @description 帖子结构化数据-视频类型-站外视频
   * @since Beta v0.3.4
   * @interface Video
   * @extends Base
   * @property {string} insert.video - 视频链接
   * @return Video
   */
  interface Video extends Base {
    insert: {
      video: string;
    };
  }

  /**
   * @description 帖子结构化数据-大别野卡片
   * @since Beta v0.3.4
   * @interface VillaCard
   * @extends Base
   * @property {string} insert.villa_card.villa_id - 别墅ID
   * @property {string} insert.villa_card.villa_name - 别墅名称
   * @property {string} insert.villa_card.villa_avatar_url - 别墅头像
   * @property {string} insert.villa_card.villa_cover - 别墅封面
   * @property {string} insert.villa_card.owner_uid - 别墅主人ID
   * @property {string} insert.villa_card.owner_nickname - 别墅主人昵称
   * @property {string} insert.villa_card.owner_avatar_url - 别墅主人头像
   * @property {string} insert.villa_card.villa_introduce - 别墅介绍
   * @property {string[]} insert.villa_card.tag_list - 别墅标签
   * @property {string} insert.villa_card.villa_member_num - 别墅成员数量
   * @return VillaCard
   */
  interface VillaCard extends Base {
    insert: {
      villa_card: {
        villa_id: string;
        villa_name: string;
        villa_avatar_url: string;
        villa_cover: string;
        owner_uid: string;
        owner_nickname: string;
        owner_avatar_url: string;
        villa_introduce: string;
        tag_list: string[];
        villa_member_num: string;
      };
    };
  }

  /**
   * @description 帖子结构化数据-视频类型-站内视频
   * @since Beta v0.3.4
   * @interface Vod
   * @extends Base
   * @property {number} insert.vod.id - 视频ID
   * @property {number} insert.vod.duration - 视频时长
   * @property {string} insert.vod.cover - 视频封面
   * @property {Array} insert.vod.resolutions - 视频分辨率
   * @property {string} insert.vod.resolutions.url - 视频链接
   * @property {string} insert.vod.resolutions.definition - 视频清晰度
   * @property {number} insert.vod.resolutions.height - 视频高度
   * @property {number} insert.vod.resolutions.width - 视频宽度
   * @property {number} insert.vod.resolutions.bitrate - 视频码率
   * @property {number} insert.vod.resolutions.size - 视频大小
   * @property {string} insert.vod.resolutions.format - 视频格式
   * @property {string} insert.vod.resolutions.label - 视频标签
   * @property {number} insert.vod.view_num - 观看次数
   * @property {number} insert.vod.transcode_status - 转码状态
   * @property {number} insert.vod.review_status - 审核状态
   * @return Vod
   */
  interface Vod extends Base {
    insert: {
      vod: {
        id: number;
        duration: number;
        cover: string;
        resolutions: Array<{
          url: string;
          definition: string;
          height: number;
          width: number;
          bitrate: number;
          size: number;
          format: string;
          label: string;
        }>;
        view_num: number;
        transcode_status: number;
        review_status: number;
      };
    };
  }
}
