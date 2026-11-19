/**
 * 榜单瀑布流布局计算。
 * @since Beta v0.13.2
 */

/** 待排版帖子的标识与封面比例。 @since Beta v0.13.2 */
type MasonryItem = { id: string; ratio: number };
/** 卡片的实测尺寸。 @since Beta v0.13.2 */
type MasonrySize = { width: number; height: number };
/** 卡片在瀑布流中的位置与对应榜单索引。 @since Beta v0.13.2 */
type MasonryPosition = { id: string; index: number; top: number; left: number; height: number };
/** 瀑布流的卡片宽度、内容总高度和位置。 @since Beta v0.13.2 */
type MasonryLayout = { width: number; height: number; positions: Array<MasonryPosition> };
/** 单张卡片的过渡时长与启动延时。 @since Beta v0.13.2 */
type MasonryTiming = { duration: number; delay: number };

const gap = 12;
const minCardWidth = 256;
const estimatedBodyHeight = 144;

/**
 * 按预估高度分列，使用实测高度计算位置。实测高度变化时保留所在列。
 * @since Beta v0.13.2
 * @param items - 按榜单顺序排列的帖子及其封面宽高比
 * @param width - 容器宽度
 * @param sizes - 近期测量的卡片尺寸
 * @returns 卡片位置、宽度和列表总高度
 */
export function layoutRankMasonry(
  items: ReadonlyArray<MasonryItem>,
  width: number,
  sizes: ReadonlyMap<string, MasonrySize>,
): MasonryLayout {
  if (width <= 0 || items.length === 0) return { width: 0, height: 0, positions: [] };
  const columns = Math.max(1, Math.floor((width + gap) / (minCardWidth + gap)));
  const cardWidth = (width - (columns - 1) * gap) / columns;
  const estimatedBottoms = Array<number>(columns).fill(0);
  const actualBottoms = Array<number>(columns).fill(0);
  const positions = items.map<MasonryPosition>(({ id, ratio }, index) => {
    const column = estimatedBottoms.indexOf(Math.min(...estimatedBottoms));
    const estimate = Math.ceil(cardWidth / ratio) + estimatedBodyHeight;
    const size = sizes.get(id);
    const height = size && Math.abs(cardWidth - size.width) < 1 ? size.height : estimate;
    const top = actualBottoms[column];
    estimatedBottoms[column] += estimate + gap;
    actualBottoms[column] += height + gap;
    return { id, index, top, left: column * (cardWidth + gap), height };
  });
  return { width: cardWidth, height: Math.max(...actualBottoms) - gap, positions };
}

/**
 * 将可见卡片按顺序排入总时长，相邻卡片的启动间隔为单张过渡时长的一半。
 * @since Beta v0.13.2
 * @param count - 可见卡片数
 * @param totalDuration - 从第一张卡片启动到最后一张卡片结束的时长（毫秒）
 * @returns 按卡片顺序排列的动画时间
 */
export function getRankMasonryTimings(count: number, totalDuration: number): Array<MasonryTiming> {
  const interval = totalDuration / (count + 1);
  return Array.from({ length: count }, (_, index) => ({
    duration: interval * 2,
    delay: index * interval,
  }));
}
