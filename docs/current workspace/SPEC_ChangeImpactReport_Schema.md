好的，遵照指示。

我将根据《项目代办事项列表 (V2.3)》中的顺序，开始执行下一项待办工作：**撰写《变更影响报告 Schema 规范》**。

这份文档旨在为系统在执行“变更管理”流程（URD §3.2）时生成的关键审计产物——《变更影响报告》——定义一个清晰、标准化的结构。这份报告既需要人类用户能够清晰阅读以理解决策过程，也需要能被系统确定性地解析以用于追溯。

以下是本次工作的产出文档。

---

### **变更影响报告 Schema 规范 (V1.0)**

**状态:** 草稿 (Draft)

**版本说明:** 本文档 (V1.0) 是该 Schema 规范的初版。其目的是为 `L1-DP7: 版本控制与变更服务` 在执行变更管理流程时生成的《变更影响报告》（`change_impact_report.md`）定义一个清晰、标准、可审计的结构。

#### **1. 引言**

本文档定义了“变更影响报告”（`change_impact_report.md`）的标准结构。该文档是系统变更管理流程（URD §3.2）中的一个核心审计产物，由 `L1-DP7: 版本控制与变更服务` 在用户最终确认变更决策后生成。

**设计目标:**
*   **人类可读性 (Human-Readable):** 报告必须以清晰的 Markdown 格式呈现，便于项目管理者和用户进行审计，理解变更的完整上下文和决策依据。
*   **机器可解析性 (Machine-Parsable):** 报告的核心元数据必须以结构化的方式嵌入，以便于系统进行自动化的追溯和分析。
*   **审计与追溯性 (Audit & Traceability):** 报告是连接一次“变更”和其导致的下游“作废”操作之间的关键证据。它**必须**记录系统分析、用户决策和最终执行的完整链条。

本规范采用与项目内其他结构化 Markdown 文件（如 `review_feedback.md`）相同的模式：通过 **YAML Front Matter** 实现元数据的结构化，通过 **标准化的 Markdown 标题和表格** 实现内容的结构化。

**设计依据:**
*   《软件用户需求文档 (URD) V1.6》 (特别是 §3.2.5)
*   《L1-DP7 版本控制与变更服务 API 接口规范 (V1.1)》
*   《项目代办事项列表 (V2.3)》

#### **2. 文件结构定义**

`change_impact_report.md` 文件由两部分组成：一个 YAML Front Matter 块和一个 Markdown 正文。

##### **2.1. YAML Front Matter**

此部分包含了所有用于追溯和审计的核心元数据。它必须位于文件的最顶部，并由三条短划线 (`---`) 包围。

| 键 (Key)                 | 类型   | 是否必需 | 描述                                                                    | 来源 (URD §3.2.5) / API                                                                                                |
| :----------------------- | :----- | :------- | :---------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------- |
| `report_id`              | string | 是       | 本次变更影响报告的唯一标识符。                                          | 由 `L1-DP7` 服务生成。                                                                                                 |
| `source_document_uri`    | string | 是       | 被修改的、已“冻结”的源文档的 URI。                                      | (a) / `L1-DP7 API: /change-proposals` 请求体                                                                           |
| `change_proposal_id`     | string | 是       | 触发本次报告生成的变更提议的唯一 ID。                                   | `L1-DP7` 内部状态。                                                                                                    |
| `decision_maker_id`      | string | 是       | 做出最终决策的用户或系统组件的标识符。                                  | (d) / `L1-DP7` 从调用 `confirm` 端点的请求头中获取。                                                                   |
| `decision_timestamp`     | string | 是       | 用户做出最终决策的时间戳 (ISO 8601格式)。                               | (d) / `L1-DP7` 在 `confirm` 端点被调用时生成。                                                                         |
| `associated_commit_id`   | string | 是       | 执行此次变更并合入主分支的最终 Git Commit 的哈希值。                      | 由 `L1-DP7` 在 `execute` 操作成功后关联。                                                                              |
| `invalidated_doc_count`  | number | 是       | 用户最终决定作废的下游文档总数。                                        | (c) / 对 `confirm` 端点请求体中 `invalidated_documents` 数组的计数。                                                   |

##### **2.2. Markdown 正文 (Body)**

正文部分使用标准的 Markdown 语法，以人类可读的方式展示变更影响分析的详细内容和最终决策。

*   **一级标题 (`#`):** `变更影响报告`

*   **二级标题 (`##`):** `1. 变更摘要`
    *   **内容:** 渲染一个包含核心元数据摘要的表格，方便快速浏览。
    *   **表格内容:** 至少应包含：`变更源文档`, `变更提议ID`, `决策者`, `决策时间`。

*   **二级标题 (`##`):** `2. 系统分析的依赖关系`
    *   **内容:** 将 `L1-DP7` 的 `/analysis-report` 端点输出的系统分析结果渲染成一个 Markdown 表格。这是 URD §3.2.3 要求的辅助分析部分。
    *   **表格列:**
        1.  **下游文档 (Downstream Document):** 依赖于源文档的下游文档的 URI。
        2.  **置信度 (Confidence Score):** 系统分析得出的依赖关系置信度（如 `HIGH`, `MEDIUM`, `LOW`）。
        3.  **分析说明 (Analysis Notes):** 系统对该依赖关系的简要说明（例如，“直接父子关系”、“通过 `[TraceabilityCheck]` 强引用”、“通过关键词匹配的弱引用”等）。

*   **二级标题 (`##`):** `3. 用户最终决策：作废的文档清单`
    *   **内容:** 这是报告中最重要的部分，记录了用户的最终决策，明确了哪些文档因本次变更而失效。
    *   **格式:** 一个清晰的、无歧义的 Markdown 列表，逐项列出所有被用户在 `confirm` 步骤中标记为“作废”的文档 URI。

#### **3. 完整示例**

以下是一个完整的 `change_impact_report.md` 文件示例。

```markdown
---
report_id: "cir-20250609-a1b2c3d4"
source_document_uri: "vcs://project-gamma/docs/ADD_L1.md?version=frozen-v1.1"
change_proposal_id: "cp-20250609-x7y8z9"
decision_maker_id: "user-alice"
decision_timestamp: "2025-06-09T14:30:00Z"
associated_commit_id: "f4a5c6b7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3"
invalidated_doc_count: 2
---

# 变更影响报告

## 1. 变更摘要

| 属性                   | 值                                                              |
| :--------------------- | :-------------------------------------------------------------- |
| **变更源文档**         | `vcs://project-gamma/docs/ADD_L1.md?version=frozen-v1.1`         |
| **变更提议 ID**        | `cp-20250609-x7y8z9`                                            |
| **决策者**             | `user-alice`                                                    |
| **决策时间**           | `2025-06-09T14:30:00Z`                                          |
| **关联的 Git Commit** | `f4a5c6b7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3`                       |

## 2. 系统分析的依赖关系

系统根据变更内容，分析出以下可能受影响的下游文档。**最终决策由用户在下一节中做出。**

| 下游文档                                                 | 置信度 | 分析说明                                      |
| :------------------------------------------------------- | :------- | :-------------------------------------------- |
| `vcs://project-gamma/docs/AD_L2_DP5_ContentEngine.md`    | HIGH     | 直接父子关系：本文档是源文档 `L1-DP5` 的分解。 |
| `vcs://project-gamma/docs/AD_L2_DP6_ReviewEngine.md`     | HIGH     | 直接父子关系：本文档是源文档 `L1-DP6` 的分解。 |
| `vcs://project-gamma/specs/IF_L1-DP1_API_Spec.md`        | LOW      | 弱引用：文档内容中包含关键词 "L1-DP5"。       |

## 3. 用户最终决策：作废的文档清单

根据上述系统分析，决策者 `user-alice` 已确认以下文档因源文档的变更而失效，必须被作废并重新生成：

*   `vcs://project-gamma/docs/AD_L2_DP5_ContentEngine.md`
*   `vcs://project-gamma/docs/AD_L2_DP6_ReviewEngine.md`

---
Gemini 2.5 Pro 0605 writer
```