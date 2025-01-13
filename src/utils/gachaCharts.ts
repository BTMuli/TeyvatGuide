/**
 * @file utils/gachaCharts.ts
 * @description 祈愿图表配置
 * @since Beta v0.6.8
 */

import TSUserGacha from "@Sqlite/modules/userGacha.js";
// @ts-expect-error no-export-member
import type { BarSeriesOption } from "echarts/charts.js";
import type { EChartsOption, XAXisOption } from "echarts/types/dist/shared.js";

/**
 * @description 获取整体祈愿图表配置
 * @param {string} uid - 用户UID
 * @returns {EChartsOption}
 */
async function getOverviewOptions(uid: string): Promise<EChartsOption> {
  const records = await TSUserGacha.getGachaRecords(uid);
  const data: EChartsOption = {
    title: [
      {
        text: ">> 祈愿系统大数据分析 <<",
        left: "center",
        top: "5%",
      },
      {
        text: "卡池分布",
        left: "17%",
        top: "45%",
      },
      {
        text: "星级分布",
        left: "17%",
        top: "90%",
      },
      {
        text: "角色池分布",
        left: "45%",
        bottom: "10%",
      },
      {
        text: "武器池分布",
        right: "5%",
        bottom: "10%",
      },
    ],
    tooltip: { trigger: "item" },
    legend: {
      type: "scroll",
      orient: "vertical",
      left: 10,
      top: 20,
      bottom: 20,
    },
    toolbox: {
      show: true,
      feature: {
        restore: {},
        saveAsImage: {},
      },
    },
    series: [
      {
        name: "卡池分布",
        type: "pie",
        radius: "50%",
        data: [],
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: "rgba(0, 0, 0, 0.5)",
          },
        },
        right: "60%",
        top: 0,
        bottom: "50%",
      },
      {
        name: "星级分布",
        type: "pie",
        radius: "50%",
        data: [],
        right: "60%",
        top: "50%",
        bottom: "0",
      },
      {
        name: "角色池分布",
        type: "pie",
        radius: [30, 150],
        center: ["50%", "50%"],
        roseType: "area",
        itemStyle: { borderRadius: [2, 10] },
        data: [],
        datasetIndex: 3,
      },
      {
        name: "武器池分布",
        type: "pie",
        radius: [30, 100],
        itemStyle: { borderRadius: [3, 10] },
        data: [],
        left: "70%",
      },
    ],
  };
  if (data.title !== undefined && Array.isArray(data.title)) {
    data.title[0].subtext = `共 ${records.length} 条数据`;
  }
  if (data.series !== undefined && Array.isArray(data.series)) {
    data.series[0].data = [
      {
        value: records.filter((item) => item.uigfType === "100").length,
        name: "新手祈愿",
      },
      {
        value: records.filter((item) => item.uigfType === "200").length,
        name: "常驻祈愿",
      },
      {
        value: records.filter((item) => item.uigfType === "301").length,
        name: "角色活动祈愿",
      },
      {
        value: records.filter((item) => item.uigfType === "302").length,
        name: "武器活动祈愿",
      },
      {
        value: records.filter((item) => item.uigfType === "500").length,
        name: "集录祈愿",
      },
    ];
    data.series[1].data = [
      { value: records.filter((item) => item.rank === "3").length, name: "3星" },
      { value: records.filter((item) => item.rank === "4").length, name: "4星" },
      { value: records.filter((item) => item.rank === "5").length, name: "5星" },
    ];
  }
  const tempSet = new Set<string>();
  const tempRecord = new Map<string, number>();
  // 角色池分析
  let tempList = records.filter((item) => item.uigfType === "301");
  let star3 = tempList.filter((item) => item.rank === "3").length;
  if (data.title !== undefined && Array.isArray(data.title)) {
    data.title[3].subtext = `共 ${tempList.length} 条数据, 其中三星武器 ${star3} 抽`;
  }
  tempList
    .filter((item) => item.rank !== "3")
    .forEach((item) => {
      if (tempSet.has(item.name)) {
        tempRecord.set(item.name, (tempRecord.get(item.name) ?? 0) + 1);
      } else {
        tempSet.add(item.name);
        tempRecord.set(item.name, 1);
      }
    });
  if (data.series !== undefined && Array.isArray(data.series)) {
    data.series[2].data = Array.from(tempRecord).map((item) => ({ value: item[1], name: item[0] }));
  }
  tempSet.clear();
  tempRecord.clear();
  // 武器池分析
  tempList = records.filter((item) => item.uigfType === "302");
  star3 = tempList.filter((item) => item.rank === "3").length;
  if (data.title !== undefined && Array.isArray(data.title)) {
    data.title[4].subtext = `共 ${tempList.length} 条数据，其中三星武器 ${star3} 抽`;
  }
  tempList
    .filter((item) => item.rank !== "3")
    .forEach((item) => {
      if (tempSet.has(item.name)) {
        tempRecord.set(item.name, (tempRecord.get(item.name) ?? 0) + 1);
      } else {
        tempSet.add(item.name);
        tempRecord.set(item.name, 1);
      }
    });
  if (data.series !== undefined && Array.isArray(data.series)) {
    data.series[3].data = Array.from(tempRecord).map((item) => ({ value: item[1], name: item[0] }));
  }
  return data;
}

/**
 * @description 获取日历图表配置
 * @param {string} uid - 用户UID
 * @param {string} gachaType - 祈愿类型
 * @returns {EChartsOption}
 */
async function getCalendarOptions(uid: string, gachaType?: string): Promise<EChartsOption> {
  const records = await TSUserGacha.getGachaRecordsGroupByDate(uid, gachaType);
  // 获取最大长度
  const maxLen = Math.max(...Object.values(records).map((v) => v.length));
  // 获取年份
  const yearsSet = new Set(Object.keys(records).map((v) => v.split("-")[0]));

  function getYearData(year: string): [string, number][] {
    const res: [string, number][] = [];
    for (const key in records) {
      if (key.startsWith(year)) res.push([key, records[key].length]);
    }
    return res;
  }

  return {
    tooltip: { position: "top" },
    toolbox: { show: true, feature: { restore: {}, saveAsImage: {} } },
    visualMap: {
      min: 0,
      max: maxLen,
      calculable: true,
      orient: "horizontal",
      left: "center",
      top: "top",
    },
    calendar: Array.from(yearsSet).map((year, index) => ({
      range: year,
      cellSize: ["auto", 15],
      top: 150 * index + 80,
    })),
    series: Array.from(yearsSet).map((year, index) => ({
      type: "heatmap",
      coordinateSystem: "calendar",
      calendarIndex: index,
      data: getYearData(year),
    })),
  };
}

/**
 * @description 堆叠柱状图
 * @param {string} uid - 用户UID
 * @param {string} gachaType - 祈愿类型
 * @returns {EChartsOption}
 */
async function getStackBarOptions(uid: string, gachaType?: string): Promise<EChartsOption> {
  const records = await TSUserGacha.getGachaRecordsGroupByDate(uid, gachaType);
  const xAxis: XAXisOption = {
    type: "category",
    data: Object.keys(records),
    axisTick: { alignWithLabel: true },
    axisLine: { show: true, lineStyle: { color: "#000" } },
    axisLabel: {
      rotate: 45,
      interval: 4,
      fontSize: 12,
      fontFamily: "var(--font-title)",
    },
    // 间距
    axisPointer: { type: "shadow" },
  };
  const temp5 = [];
  const temp4 = [];
  const temp3 = [];
  for (const key in records) {
    const gachaLogs = records[key];
    const star5 = gachaLogs.filter((r) => r.rank === "5").length;
    const star4 = gachaLogs.filter((r) => r.rank === "4").length;
    const star3 = gachaLogs.filter((r) => r.rank === "3").length;
    temp5.push(star5);
    temp4.push(star4);
    temp3.push(star3);
  }
  const series: BarSeriesOption = [
    { data: temp5, type: "bar", stack: "a", name: "五星数量", barWidth: "10px" },
    { data: temp4, type: "bar", stack: "a", name: "四星数量", barWidth: "10px" },
    { data: temp3, type: "bar", stack: "a", name: "三星数量", barWidth: "10px" },
  ];
  return {
    title: { text: "祈愿记录" },
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    toolbox: { show: true, feature: { restore: {}, saveAsImage: {} } },
    legend: { data: ["三星数量", "四星数量", "五星数量"] },
    xAxis,
    yAxis: { type: "value" },
    series,
    dataZoom: [
      {
        type: "inside",
        show: true,
        xAxisIndex: [0],
        start: 0,
        end: 100,
        zoomOnMouseWheel: true,
      },
    ],
  };
}

const TGachaCharts = {
  overview: getOverviewOptions,
  calendar: getCalendarOptions,
  stackBar: getStackBarOptions,
};

export default TGachaCharts;
