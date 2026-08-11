/**
 * 应用素材日历相关类型定义文件
 * @since Beta v0.11.3
 */

declare namespace TGApp.App.Material {
  /**
   * WIKI信息
   * @since Beta v0.11.3
   */
  type WikiItem = {
    /** 材料ID */
    id: number;
    /** 材料名称 */
    name: string;
    /** 材料简介 */
    description: string;
    /** 材料类型 */
    type: string;
    /** 自定义材料归并分类 */
    cType: string;
    /** 材料星级 */
    star: number;
    /** 材料来源 */
    source: Array<Source>;
    /** 材料转换 */
    convert: Array<Convert>;
  };

  /**
   * WIKI 料理食材
   * @since Beta v0.11.3
   */
  type WikiFoodInput = {
    /** 食材 ID */
    id: number;
    /** 食材名称 */
    name: string;
    /** 食材图标 */
    icon: string;
    /** 所需数量 */
    count: number;
  };

  /**
   * WIKI 料理品质类型
   * @since Beta v0.11.3
   */
  type WikiFoodKind = "strange" | "normal" | "delicious" | "special";

  /**
   * WIKI 料理信息
   * @since Beta v0.11.3
   */
  type WikiFood = {
    /** 料理 ID */
    id: number;
    /** 料理效果 */
    effect: Array<string>;
    /** 料理效果图标 */
    effectIcon?: string;
    /** 对应食谱 ID */
    recipeId?: number;
    /** 料理品质 */
    kind?: WikiFoodKind;
  };

  /**
   * WIKI 料理食谱信息
   * @since Beta v0.11.3
   */
  type WikiFoodRecipe = {
    /** 食谱 ID */
    id: number;
    /** 料理食材 */
    input: Array<WikiFoodInput>;
    /** 料理变体 */
    variants: WikiFoodRecipeVariants;
  };

  /**
   * WIKI 料理食谱变体
   * @since Beta v0.11.3
   */
  type WikiFoodRecipeVariants = {
    /** 角色特殊料理 */
    special: Array<WikiFoodRecipeSpecial>;
    /** 奇怪的料理 ID */
    strange?: number;
    /** 普通料理 ID */
    normal?: number;
    /** 美味的料理 ID */
    delicious?: number;
  };

  /**
   * WIKI 角色特殊料理
   * @since Beta v0.11.3
   */
  type WikiFoodRecipeSpecial = {
    /** 角色 ID */
    characterId: number;
    /** 特殊料理 ID */
    foodId: number;
  };

  /**
   * WIKI 书籍信息
   * @since Beta v0.11.3
   */
  type WikiBook = {
    /** 书籍 ID */
    id: number;
    /** 书籍名称 */
    name: string;
    /** 所属书籍名称，用于标识同一书籍的不同卷 */
    vol?: string;
    /** 书籍简介 */
    description: string;
    /** 故事 ID */
    storyId: string;
    /** 书籍内容 */
    story: string;
  };

  /**
   * 材料来源
   * @since Beta v0.4.4
   */
  type Source = {
    /** 来源名称 */
    name: string;
    /** 来源类型 */
    type: string;
    /** 掉落日期 */
    days?: Array<number>;
  };

  /**
   * 材料转换
   * @since Beta v0.9.0
   */
  type Convert = {
    /** 合成ID */
    id: string;
    /** 合成材料 */
    source: Array<ConvertSrc>;
  };

  /**
   * 转换来源
   * @since Beta v0.9.1
   */
  type ConvertSrc = {
    /** 材料ID */
    id: string;
    /** 材料名称 */
    name: string;
    /** 材料类型 */
    type: string;
    /** 材料星级 */
    star: number;
    /** 需要数量 */
    count: number;
  };
}
