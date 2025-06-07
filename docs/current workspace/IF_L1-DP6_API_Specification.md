好的，遵照指示。

我已收到并深入理解了《评审意见：关于<L1-DP6 评审与评估引擎 API 接口规范 (V1.0)>》中下达的强制性修订指令。评审结论为“驳回，需强制性修订”。

我将依据评审意见中列出的两项强制性修订指令和一项建议性修订意见，对该 API 规范进行重大修订。本次修订旨在解决原设计中存在的、关于核心工作流驱动和技术架构健壮性的致命缺陷与重大风险。

以下是根据上述评审意见修订后的完整文档。

---

### **L1-DP6 评审与评估引擎 API 接口规范 (V1.1)**

**状态:** 已批准 (Approved)

**版本说明:** 本文档 (V1.1) 是对 V1.0 版本的重大修订。它依据《评审意见：关于<L1-DP6 评审与评估引擎 API 接口规范 (V1.0)>》进行了强制性修订，以解决核心工作流驱动和技术架构的健壮性问题。核心变更包括：
1.  **支持仲裁流程:** 为 `ReviewResponse` 模型增加了 `ARBITRATION_REQUIRED` 决策和 `decision_reason` 字段，使 API 能够将“需要用户仲裁”的关键事件通知给工作流控制器 (`L1-DP0`)，解决了原设计中无法驱动核心状态转换的致命缺陷 (URD §4.3)。
2.  **实现异步任务模式:** 将 `POST /api/v1/reviews` 端点重构为异步模式。调用后立即返回 `202 Accepted` 并提供一个任务URL，调用方通过轮询 `GET /api/v1/reviews/{review_id}` 端点获取最终结果。这解决了同步阻塞模式在处理长时任务时的超时风险和可扩展性问题。
3.  **增强类型安全:** 将 `ReviewRequest.context.upstream_documents.relationship` 字段明确为枚举类型，提高了 API 契约的健壮性。

#### **1. 引言**

本文档详细定义了 `L1-DP6: 评审与评估引擎` 的应用程序编程接口（API）。根据《公理设计辅助系统 L1 公理设计文档 (V1.1)》，`L1-DP6` 的核心职责是接收来自 `L1-DP0` 的评审任务，并依据项目模板中定义的标准（如审查清单）、项目词汇与约束、以及公理设计原则，对文档草稿进行全面的自动化评审。

**设计目标:**
*   **指令式调用 (Instructional Call):** API 接收一个高层级的评审指令，而不是海量的内容数据。引擎自身负责根据指令中的引用（URI）去获取所需的数据。
*   **结构化输出 (Structured Output):** API 的响应**必须**是一个结构化的 JSON 对象，而非纯文本。这确保了评审结果可以被系统确定性地解析和处理。
*   **解耦 (Decoupling):** 将评审逻辑与工作流控制逻辑 (`L1-DP0`) 彻底分离，使得评审策略的迭代不影响系统的核心流程。

**设计依据:**
*   《公理设计辅助系统 L1 公理设计文档 (V1.1)》 (对 L1-FR6 和 L1-DP6 的定义)
*   《软件用户需求文档 (URD) V1.6》 (特别是 §2.1, §4.2, §4.3, §6.3)
*   《评审意见：关于<L1-DP6 评审与评估引擎 API 接口规范 (V1.0)>》

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

*   **异步任务 (Asynchronous Task):** 评审是一个潜在的长时运行任务。API 调用通过启动一个后台任务来处理，并立即返回一个任务标识符。调用方必须通过该标识符异步轮询任务的状态和最终结果。
*   **评审决策 (Review Decision):** API 返回的最高级别结论，明确指出文档是被“批准”、“需要修订”还是需要“用户仲裁”。
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
        *   `relationship` (string, enum): 关系类型。枚举值：`PARENT_DOCUMENT` (用于追踪性检查), `CHECKLIST_REFERENCE` (审查清单中引用的文档)。
*   `previous_review_cycle` (object, 可选): 如果是再次评审，此对象包含上一轮循环的产出。

##### **4.2. ReviewResponse (评审响应)**
这是成功评审后返回的数据结构，是 `GET /api/v1/reviews/{review_id}` 的最终成功响应体。

```json
{
  "review_id": "string",
  "overall_decision": "string",
  "decision_reason": {
    "type": "object",
    "optional": true,
    "$ref": "#/definitions/DecisionReason"
  },
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
*   `overall_decision` (string): 最终评审决策。枚举值：`APPROVED`, `REVISION_REQUESTED`, `ARBITRATION_REQUIRED`。
*   `decision_reason` (object, 可选): 当 `overall_decision` 为 `ARBITRATION_REQUIRED` 时提供，用于解释触发仲裁的原因。
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
*   `suggestion` (string, 可选): 具体的修改建议。

##### **4.5. DecisionReason (决策原因)**
```json
{
  "code": "string",
  "message": "string"
}
```
*   `code` (string): 机器可读的触发代码。枚举值：`MAX_CYCLES_REACHED`, `STALEMATE_DETECTED`。
*   `message` (string): 对触发原因的人类可读描述。

##### **4.6. ReviewStatus (评审状态)**
这是 `POST /api/v1/reviews` 成功后的响应体，以及任务进行中时 `GET /api/v1/reviews/{review_id}` 的响应体。
```json
{
  "review_id": "string",
  "status": "string"
}
```
*   `review_id` (string): 评审任务的唯一标识符。
*   `status` (string): 评审任务的当前状态。枚举值: `PENDING`, `RUNNING`。

#### **5. 端点定义**

##### **POST /api/v1/reviews**
*   **描述:** 启动一个新的文档评审任务。这是一个**异步**操作。API 会验证请求的合法性，创建任务，然后立即返回 `202 Accepted`，并附带一个 `Location` 头，指向可用于查询任务状态和结果的资源 URL。
*   **请求体:** `ReviewRequest` 对象。
*   **成功响应:**
    *   **状态码:** `202 Accepted`
    *   **Headers:** `Location: /api/v1/reviews/{review_id}`
    *   **响应体:** 一个 `ReviewStatus` JSON 对象，其状态为 `PENDING`。
*   **错误响应:**
    *   `400 Bad Request`: 请求体格式错误，或缺少必需的字段。
    *   `404 Not Found`: 请求中引用的某个 URI 无法被解析或找到。
    *   `401 Unauthorized`, `403 Forbidden`。
    *   `500 Internal Server Error`: 启动评审任务时发生内部错误。

##### **GET /api/v1/reviews/{review_id}**
*   **描述:** 查询一个特定评审任务的状态或获取其最终结果。客户端应轮询此端点直至任务完成。
*   **路径参数:** `review_id` (string, 必需): 通过 `POST` 请求创建任务时返回的唯一ID。
*   **成功响应:**
    *   **当任务正在进行中:**
        *   **状态码:** `200 OK`
        *   **响应体:** 一个 `ReviewStatus` JSON 对象，其 `status` 字段为 `PENDING` 或 `RUNNING`。
    *   **当任务已完成:**
        *   **状态码:** `200 OK`
        *   **响应体:** 一个完整的 `ReviewResponse` JSON 对象。
*   **错误响应:**
    *   `404 Not Found`: 指定的 `review_id` 不存在。
    *   `401 Unauthorized`, `403 Forbidden`。
    *   `500 Internal Server Error`: 获取任务状态或结果时发生内部错误。

#### **6. 示例：调用流程与cURL**

**场景:** `L1-DP0` 提交一份文档草稿供评审。在多次修订后，评审已达到项目模板中设定的最大循环次数，引擎决定需要用户仲裁。

##### **步骤 1: 提交评审任务 (POST)**
`L1-DP0` 发起评审请求。
```bash
# L1-DP0 (工作流控制器) 请求评审一份文档草稿
curl -i -X POST \
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

# 服务器接受请求，创建任务，并立即返回
# HTTP/1.1 202 Accepted
# Location: /api/v1/reviews/rev-20250608-x7y8z9
# Content-Type: application/json
#
# {
#   "review_id": "rev-20250608-x7y8z9",
#   "status": "PENDING"
# }
```

##### **步骤 2: 轮询任务状态 (GET)**
`L1-DP0` 使用 `Location` 头中的 URL 轮询任务状态。
```bash
# L1-DP0 轮询任务状态
curl -X GET \
  -H "Authorization: Bearer <system_component_token>" \
  -H "X-System-Component-ID: L1-DP0" \
  'https://<hostname>/api/v1/reviews/rev-20250608-x7y8z9'

# 任务正在进行中，服务器返回状态
# HTTP/1.1 200 OK
# Content-Type: application/json
#
# {
#   "review_id": "rev-20250608-x7y8z9",
#   "status": "RUNNING"
# }
```

##### **步骤 3: 获取最终结果 (GET)**
`L1-DP0` 继续轮询，直到任务完成并获得最终的 `ReviewResponse`。
```bash
# 最终，任务完成，服务器返回完整响应
# HTTP/1.1 200 OK
# Content-Type: application/json
#
# {
#   "review_id": "rev-20250608-x7y8z9",
#   "overall_decision": "ARBITRATION_REQUIRED",
#   "decision_reason": {
#     "code": "MAX_CYCLES_REACHED",
#     "message": "The document review has reached the maximum of 5 cycles without achieving approval."
#   },
#   "executive_summary": "The document still fails to address a critical Independence Axiom violation after multiple revisions. User arbitration is now required to proceed.",
#   "checklist_responses": [
#     {
#       "checklist_item_text": "[Axiom1-Check] Analyze the design matrix for any off-diagonal elements and challenge their necessity.",
#       "status": "FAILED",
#       "evidence": "Finding [find-001] remains unresolved: The L2 design matrix is still not diagonal or lower-triangular, indicating persistent coupling."
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
#     }
#   ]
# }
```

---
Gemini 2.5 Pro 0605 writer