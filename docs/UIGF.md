---
Author: 目棃
Date: 2023-04-07
Description: UIGF v2.3 Backup
Update: 2023-04-07
---

> 本文档 [`Front-matter`](https://github.com/BTMuli/Mucli#FrontMatter) 由 [MuCli](https://github.com/BTMuli/Mucli) 自动生成于`2023-04-07 19:51:40`
> 
> 更新于 `2023-04-07 19:51:40`

> 本文档为 [`UIGF`](https://github.com/UIGF-org/UIGF-org.github.io/blob/main/docs/zh/standards/UIGF-pre-release.md) 的备份。

# 统一可交换祈愿记录标准 v2.3

> Uniformed Interchangeable GachaLog Format standard (UIGF) v2.3

## 更新记录

|版本|说明|兼容|
|-|-|-|
|`v2.0`| 首个正式版本 | v2.0 |
|`v2.1`| 简化了部分语言表述，与 v2.0在数据格式上完全一致 | v2.1 and lower |
|`v2.2`| 新增 `info.export_timestamp` 填充 UNIX 时间戳 | v2.2 and lower |
|`v2.3`| 扩充至非中文语境，使用 Json Schema 表述 | v2.3 and lower |

## Id

原神的祈愿记录物品内包含了一项较为特殊的字段: `id` ，该值在 1.3版本后加入  
所以**先前查询出的物品**若无特殊兼容性修改则不会包含相应的 `id`  
App 导出 UIGF 时
* 需要确保每个物品的 `id`  的有效性。  
* 从最后一个自带有效 `id` 的物品开始，向前（相对于时间）依次递减 `id` 的值,每次递减的值应保持为 `1`

导入 UIGF 到 App 时
* App不应假设所有的 `gacha_item` 都有有效的 `id` 值
* App应具有处理 `id` 字段为 `null`或 `` 空字符串的能力

## GachaType

祈愿包含了会共享保底与概率的卡池，所以需要一个额外的字段来界定  
我们在`UIGF`的所有格式中注入了`uigf_gacha_type`字段  
在导出到`UIGF`格式时需要注意添加对应的`uigf_gacha_type`字段

### 映射关系

|`uigf_gacha_type`|`gacha_type`|
|-|-|
|`100`|`100`|
|`200`|`200`|
|`301`|`301` or `400`|
|`302`|`302`|

## Json 格式

> Uniformed Interchangeable GachaLog Format standard of Json (UIGF.J)
Json 格式 由于 与从官方接口获取到的格式一致  
更便于各App的导入与导出，我们也在此做出规范  
该格式应仅用于各App间的数据互通

### 导出的格式

```json
{
  "type": "object",
  "title": "UIGF object",
  "properties": {
    "info": {
      "type": "object",
      "properties": {
        "uid": {
          "type": "string",
          "title": "Uid",
          "description": "Uid"
        },
        "lang": {
          "type": "string",
          "title": "Language",
          "description": "语言 ISO 3166"
        },
        "uigf_version": {
          "type": "string",
          "title": "UIGF Version",
          "description": "UIGF 版本号"
        },
        "export_timestamp": {
          "type": "number",
          "title": "Export Timestamp",
          "description": "导出时间戳（秒）"
        },
        "export_time": {
          "type": "string",
          "description": "导出时间",
          "format": "date-time",
          "pattern": "yyyy-MM-dd HH:mm:ss",
          "title": "Export Time"
        },
        "export_app": {
          "type": "string",
          "title": "Export App",
          "description": "导出应用"
        },
        "export_app_version": {
          "type": "string",
          "title": "Export App Version",
          "description": "导出应用版本"
        }
      },
      "title": "Infomation",
      "required": [
        "uid",
        "lang",
        "uigf_version"
      ],
      "description": "包含导出方定义的基本信息"
    },
    "list": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "gacha_type": {
            "type": "string",
            "description": "祈愿类型"
          },
          "item_id": {
            "type": "string",
            "title": "Item Id",
            "description": "空字符串"
          },
          "count": {
            "type": "string",
            "title": "Count",
            "description": "数量"
          },
          "time": {
            "type": "string",
            "title": "Time",
            "description": "物品获取时间",
            "pattern": "yyyy-MM-dd HH:mm:ss",
            "format": "date-time"
          },
          "name": {
            "type": "string",
            "title": "Name",
            "description": "名称"
          },
          "item_type": {
            "type": "string",
            "title": "Item Type",
            "description": "物品类型"
          },
          "rank_type": {
            "type": "string",
            "title": "Item Quality",
            "description": "物品星级"
          },
          "id": {
            "type": "string",
            "title": "Id",
            "description": "内部数据库Id"
          },
          "uigf_gacha_type": {
            "type": "string",
            "title": "Query Type",
            "description": "向接口查询时需要的 gacha_type"
          }
        },
        "required": [
          "gacha_type",
          "name",
          "id",
          "uigf_gacha_type",
          "time"
        ],
        "title": "Gacha Item",
        "description": "祈愿物品"
      },
      "title": "List",
      "description": "物品列表"
    }
  },
  "required": [
    "info",
    "list"
  ],
  "description": "UIGF 根对象"
}
```

## Excel 工作簿 (Workbook Format)

> Uniformed Interchangeable GachaLog Format standard of Workbook (UIGF.W)

### 单元格的格式

* 在填充单元格内的数据时，应统一转换到 `String` 字符串类型后填入

### 表名及内容

|表名|内容|类型|是否必要|
|-|-|-|-|
|统计分析|统计分析内容等|任意|否|
|角色活动祈愿|`gacha_type` : `301 or 400` 的祈愿数据|祈愿表|否，但是应该导出|
|武器活动祈愿|`gacha_type` : `302` 的祈愿数据|祈愿表|否，但是应该导出|
|常驻祈愿|`gacha_type` : `200` 的祈愿数据|祈愿表|否，但是应该导出|
|新手祈愿|`gacha_type` : `100` 的祈愿数据|祈愿表|否，但是应该导出|
|原始数据|全部祈愿数据|数据表|**详见下方原始数据表结构说明**|

* 表的顺序可以是任意的
* 可以隐藏部分表，防止用户随意篡改数据
* Sheet 的名称应与游戏内祈愿记录页面显示的名称保持一致

> App间应依据 `原始数据表` 的内容，来进行数据互通

### 祈愿表结构

本节内容是为了规范兼容分析类App

* 表头对应的内容填充**顺序需要严格按照下方说明**排布
* **共享保底的卡池**按祈愿类型 (`gacha_type`) 区分
* 此类 `Sheet` 存在的目的，是为了便于用户观看与祈愿分析工具的分析

|表头|内容|是否必要|
|-|-|-|
|时间|`yyyy-MM-dd HH:mm:ss` 格式的 `time` 时间|是|
|名称|`name`物品名称|是|
|物品类型|`item_type`|是|
|星级|`rank_type`|是|
|祈愿类型|`gacha_type` 的转义名称|是，尽管部分工具不会分析此项|
|...|...|否|

> 如果你认为有必要的话，可以额外增加其他表头，但请确保表头的前几列为上表规范的内容  
> 表内的数据通常按祈愿Id升序或降序排列，分析App不应假设表内的顺序为特定的升序与降序  

#### `gacha_type` 转义名称

|gacha_type|名称|
|-|-|
|100|新手祈愿|
|200|常驻祈愿|
|301|角色活动祈愿|
|400|角色活动祈愿-2|
|302|武器活动祈愿|

#### 示例

|时间|名称|类别|星级|祈愿类型|...|
|-|-|-|-|-|-|
|2021-02-17 18:45:09|以理服人|武器|3|角色活动祈愿-2|...|
|...|...|...|...|...|...|

### 原始数据表结构

导出时

* App 在导出时应尽可能询问用户是否应包含原始数据表 
* 一旦在工作簿内包含了名为 `原始数据` 的表，即表示支持本格式
* 该表内的内容应严格按照本格式所述填充
* **表头的顺序需严格按照下表设置**。
* 现有的字段采用**字典顺序**递增排序，后续新增的字段依添加的顺序排在后侧。
* 若无特殊需求，我们建议导出所有json 数据内包含的字段

导入时

* 强烈建议您编写不依赖于列的顺序位置便可实现导入的程序，以达到最大化的兼容。
* 如果省略了其中某些非必要字段的值，请保持表头存在，对应的列则空置。

|表头|是否必要|
|-|-|
|`count`|否，但是建议保留，不排除后续会有`count`不为1的情况|
|`gacha_type`|是|
|`id`|是，且大部分App按此字段排序数据|
|`item_id`|否，目前官方已经弃用了此字段|
|`item_type`|是|
|`lang`|否，但建议保留，以便国际化|
|`name`|是|
|`rank_type`|否，但建议保留，以便分析|
|`time`|否，但建议保留，以便分析|
|`uid`|否，但建议将选择权交予用户，保留以便分析|
|`uigf_gacha_type`|是|

#### 示例

|count|gacha_type|id|item_id|item_type|lang|name|rank_type|time|uid|uigf_gacha_type|
|-|-|-|-|-|-|-|-|-|-|-|
|1|301|1613556360008291100||武器|zh-cn|以理服人|3|2021-02-17 18:45:09|123456789|301|
|...|...|...|...|...|...|...|...|...|...|...|