好的，遵照指示。

我将根据《项目代办事项列表 (V1.9)》，开始执行下一个最高优先级的待办事项：**撰写《L1-DP6 评审与评估引擎 API 接口规范》**。

这份文档将为 `L1-DP6` 组件定义一个标准化的交互契约。它将明确调用方（即 `L1-DP0` 工作流控制器）如何提交一个评审任务，包括待审文档的引用及其所有必要的上下文。同时，它将定义 `L1-DP6` 返回的结构化审查意见的数据模型，确保其输出是机器可解析的、一致的，并能无缝地驱动后续的修订或批准流程。

以下是本次工作的产出文档。

---

### **L1-DP6 评审与评估引擎 API 接口规范 (V1.0)**

**状态:** 草稿 (Draft)

**版本说明:** 本文档 (V1.0) 是该 API 规范的初版。其目的是为 `L1-DP6: 评审与评估引擎` 组件定义一个清晰、标准化的交互接口。该接口封装了评审文档、评估设计以及生成结构化审查意见的复杂逻辑。

#### **1. 引言**

本文档详细定义了 `L1-DP6: 评审与评估引擎` 的应用程序编程接口（API）。根据《公理设计辅助系统 L1 公理设计文档 (V1.1)》，`L1-DP6` 的核心职责是接收来自 `L1-DP0` 的评审任务，并依据项目模板中定义的标准（如审查清单）、项目词汇与约束、以及公理设计原则，对文档草稿进行全面的自动化评审。

**设计目标:**
*   **指令式调用 (Instructional Call):** API 接收一个高层级的评审指令，而不是海量的内容数据。引擎自身负责根据指令中的引用（URI）去获取所需的数据。
*   **结构化输出 (Structured Output):** API 的响应**必须**是一个结构化的 JSON 对象，而非纯文本。这确保了评审结果可以被系统确定性地解析和处理。
*   **解耦 (Decoupling):** 将评审逻辑与工作流控制逻辑 (`L1-DP0`) 彻底分离，使得评审策略的迭代不影响系统的核心流程。

**设计依据:**
*   《公理设计辅助系统 L1 公理设计文档 (V1.1)》 (对 L1-FR6 和 L1-DP6 的定义)
*   《软件用户需求文档 (URD) V1.6》 (特别是 §2.1, §4.2, §6.3)
*   《项目代办事项列表 (V1.9)》

#### **2. API 通用约定**

*   **主机地址 (Base URL):** 本规范不定义具体的主机地址。在实际部署中，应通过服务发现机制或配置文件来提供。所有路径均基于此 Base URL。
*   **API 版本:** API 版本通过 URL 路径进行标识。本规范定义的版本为 `v1`。
    *   示例: `https://<hostname>/api/v1/...`
*   **数据格式:** 所有请求体（`Request Body`）和响应体（`Response Body`）均使用 `application/json` 格式，并采用 `UTF-8` 编码。
*   **认证与授权:** 本 API 要求所有请求**必须**同时包含**身份标识**和**认证凭据**。
    *   **认证方式 (Authentication):** 请求方必须在 HTTP Header 中提供一个承载秘密信息的 `Authorization` 字段。
        *   **值格式:** `Bearer <token>`
    *   **身份标识 (Identification):** 请求方必须在 HTTP Header 中提供 `X-System-Component-ID` 字段，其值为调用方组件的标识符（例如 `L1-DP0`）。
*   **错误处理:** API 使用标准的 HTTP 状态码。错误响应体应包含一个标准化的错误对象。

#### **3. 核心概念**

*   **评审决策 (Review Decision):** API 返回的最高级别结论，明确指出文档是被“批准”还是需要“修订”。
*   **结构化发现 (Structured Finding):** 对文档中单个问题的具体描述，包含问题的严重性、位置、描述和建议，是构成审查意见的基本单元。
*   **统一资源标识符 (URI):** API 请求中不直接传递大型文档内容，而是通过 URI 进行引用。这要求 `L1-DP6` 的实现能够通过调用其他服务（如 `L1-DP7` 版本控制服务）来解析这些 URI 并获取内容。示例 URI 格式: `vcs://project-alpha/docs/AD_L2.md?commit=a1b2c3d4`。

#### **4. 数据模型 (Data Models)**

##### **4.1. ReviewRequest (评审请求)**
这是 `POST /api/v1/reviews` 端点的请求体。

```json
{
  "document_uri": "string",
  "context": {
    "template_uri": "string",
    "lexicon_uri": "string",
    "upstream_documents": [
      {
        "uri": "string",
        "relationship": "string"
      }
    ]
  },
  "previous_review_cycle": {
    "type": "object",
    "optional": true,
    "properties": {
      "review_feedback_uri": "string",
      "writer_summary_uri": "string"
    }
  }
}
```
*   `document_uri` (string, 必需): 待评审文档的唯一版本化 URI。
*   `context` (object, 必需): 评审所需的核心上下文引用。
    *   `template_uri` (string, 必需): 项目模板的 URI，`L1-DP6` 将从中获取审查清单和公理评估指标。
    *   `lexicon_uri` (string, 必需): 项目词汇与约束文件的 URI。
    *   `upstream_documents` (array, 必需): 一个对象数组，列出所有相关的上游文档。
        *   `uri` (string): 上游文档的 URI。
        *   `relationship` (string): 关系类型，如 `"PARENT_DOCUMENT"`（用于追踪性检查）或 `"REFERENCED_IN_CHECKLIST"`。
*   `previous_review_cycle` (object, 可选): 如果是再次评审，此对象包含上一轮循环的产出。

##### **4.2. ReviewResponse (评审响应)**
这是成功评审后返回的数据结构。

```json
{
  "review_id": "string",
  "overall_decision": "string",
  "executive_summary": "string",
  "checklist_responses": [
    { "$ref": "#/definitions/ChecklistResponseItem" }
  ],
  "findings": [
    { "$ref": "#/definitions/Finding" }
  ]
}
```
*   `review_id` (string): 本次评审任务的唯一标识符。
*   `overall_decision` (string): 最终评审决策。枚举值：`APPROVED`, `REVISION_REQUESTED`。
*   `executive_summary` (string): 对评审结果的总体摘要。
*   `checklist_responses` (array): 对模板中每个审查清单项目的逐项响应。
*   `findings` (array): 发现的具体问题列表。如果 `overall_decision` 为 `APPROVED`，此数组可以为空。

##### **4.3. ChecklistResponseItem (审查清单响应项)**

```json
{
  "checklist_item_text": "string",
  "status": "string",
  "evidence": "string"
}
```
*   `checklist_item_text` (string): 审查清单中的原始条目文本。
*   `status` (string): 该项检查的结果。枚举值：`PASSED`, `FAILED`, `NOT_APPLICABLE`。
*   `evidence` (string): 支持该状态的简要说明或证据。

##### **4.4. Finding (发现项)**

```json
{
  "finding_id": "string",
  "severity": "string",
  "description": "string",
  "location": {
    "document_uri": "string",
    "start_line": "integer",
    "end_line": "integer",
    "context_snippet": "string"
  },
  "suggestion": "string"
}
```
*   `finding_id` (string): 该发现项的唯一标识符。
*   `severity` (string): 问题的严重程度。枚举值：`CRITICAL`, `MAJOR`, `MINOR`, `SUGGESTION`。
*   `description` (string): 对问题的详细描述。
*   `location` (object): 问题在文档中的精确定位。
    *   `document_uri` (string): 发现问题所在的文档 URI (通常是 `ReviewRequest` 中的主 URI)。
    *   `start_line`, `end_line` (integer): 问题所在的起止行号。
    *   `context_snippet` (string): 问题周围的文本片段，用于提供上下文（URD §7.3 锚点机制）。
*   `suggestion` (string, 可选): 具体的修改建议。

#### **5. 端点定义**

##### **POST /api/v1/reviews**
*   **描述:** 启动一个新的文档评审任务。这是一个异步启动的操作，但本接口规范定义为同步阻塞模式，即客户端将等待评审完成后获得完整响应。未来的版本可考虑提供异步回调模式。
*   **请求体:** `ReviewRequest` 对象。
*   **成功响应:**
    *   **状态码:** `200 OK`
    *   **响应体:** 一个完整的 `ReviewResponse` JSON 对象。
*   **错误响应:**
    *   `400 Bad Request`: 请求体格式错误，或缺少必需的字段。
    *   `404 Not Found`: 请求中引用的某个 URI 无法被解析或找到。
    *   `401 Unauthorized`, `403 Forbidden`。
    *   `500 Internal Server Error`: 评审引擎内部发生未预料的错误。

#### **6. 示例：调用流程与cURL**

**场景:** `L1-DP0` 提交一份 `L2` 级别的设计文档草稿以供评审。

```bash
# L1-DP0 (工作流控制器) 请求评审一份新的文档草稿
curl -X POST \
  -H "Authorization: Bearer <system_component_token>" \
  -H "X-System-Component-ID: L1-DP0" \
  -H "Content-Type: application/json" \
  -d '{
    "document_uri": "vcs://project-alpha/docs/AD_L2_DP5_ContentEngine.md?commit=a1b2c3d4",
    "context": {
      "template_uri": "vcs://project-alpha/templates/default-engineering-v1-2.project.json?commit=f5e6d7c8",
      "lexicon_uri": "vcs://project-alpha/lexicon/project.lexicon.json?commit=b9a8c7d6",
      "upstream_documents": [
        {
          "uri": "vcs://project-alpha/docs/ADD_L1.md?commit=frozen-v1.1",
          "relationship": "PARENT_DOCUMENT"
        }
      ]
    }
  }' \
  'https://<hostname>/api/v1/reviews'

# 场景：评审完成并请求修订，成功时返回 200 OK 和 ReviewResponse JSON 对象
# HTTP/1.1 200 OK
# Content-Type: application/json
#
# {
#   "review_id": "rev-20250608-a4b5c6",
#   "overall_decision": "REVISION_REQUESTED",
#   "executive_summary": "The document provides a solid foundation but violates the Independence Axiom by introducing a coupled design in the L2 matrix. Additionally, several terms do not conform to the project lexicon.",
#   "checklist_responses": [
#     {
#       "checklist_item_text": "[Axiom1-Check] Analyze the design matrix for any off-diagonal elements and challenge their necessity.",
#       "status": "FAILED",
#       "evidence": "Finding [find-001]: The L2 design matrix is not diagonal or lower-triangular, indicating coupling."
#     },
#     {
#       "checklist_item_text": "Check for consistency with the project's Lexicon & Constraints file.",
#       "status": "FAILED",
#       "evidence": "Finding [find-002]: The term 'Task Object' is used but not defined in the lexicon."
#     }
#   ],
#   "findings": [
#     {
#       "finding_id": "find-001",
#       "severity": "CRITICAL",
#       "description": "Independence Axiom Violation: The L2 design matrix shows a dependency of FR2 on DP3. This coupling must be eliminated by redefining the FRs or DPs to achieve a decoupled design.",
#       "location": {
#         "document_uri": "vcs://project-alpha/docs/AD_L2_DP5_ContentEngine.md?commit=a1b2c3d4",
#         "start_line": 85,
#         "end_line": 92,
#         "context_snippet": "| FR / DP | DP1 | DP2 | DP3 |\n| :--- | :---: | :---: | :---: |\n| **FR1** | X | | |\n| **FR2** | O_d | X | O_d |"
#       },
#       "suggestion": "Consider creating a new L2-DP to handle the functionality that FR2 needs from DP3, or redefine FR2 to not require this information directly."
#     },
#     {
#       "finding_id": "find-002",
#       "severity": "MINOR",
#       "description": "Lexicon Inconsistency: The term 'Task Object' is introduced and used extensively, but it is not defined in the official project lexicon. All core concepts must be defined to ensure consistency.",
#       "location": {
#         "document_uri": "vcs://project-alpha/docs/AD_L2_DP5_ContentEngine.md?commit=a1b2c3d4",
#         "start_line": 56,
#         "end_line": 56,
#         "context_snippet": "...the parser outputs a standardized Task Object..."
#       },
#       "suggestion": "Add 'Task Object' to the glossary section of the project.lexicon.json file and reference it here."
#     }
#   ]
# }
```

---
Gemini 2.5 Pro 0605 writer