好的，遵照指示。

我将依据《公理设计辅助系统 L1 公理设计文档 (V1.1)》中对 `L1-DP5` 的职责定义，以及它与其他设计参数 (DPs) 之间的交互关系，开始撰写《L1-DP5 内容生成与修订引擎 API 接口规范》。

此 API 的设计将严格遵循独立公理，确保 `L1-DP5` 作为一个纯粹的功能引擎，接收所有必要的上下文作为输入，并输出文档内容作为结果，而不耦合任何关于“如何获取上下文”或“如何存储结果”的逻辑。

以下是本次工作的产出文档。

---

### **L1-DP5 内容生成与修订引擎 API 接口规范 (V1.0)**

**状态:** 草稿 (Draft)

**版本说明:** 本文档 (V1.0) 是该 API 接口规范的初版。

#### **1. 引言**

本文档详细定义了 `L1-DP5: 内容生成与修订引擎` 的应用程序编程接口（API）。根据《公理设计辅助系统 L1 公理设计文档 (V1.1)》，`L1-DP5` 的核心功能需求 (FR5) 是 **“起草与修订文档内容”**。它封装了大型语言模型 (LLM) 的文本生成和编辑能力，是系统内容创作的核心驱动力。

**设计哲学: 无副作用的纯函数 (Side-effect Free Pure Function)**
本 API 的设计严格遵循函数式编程思想。它将 `L1-DP5` 建模为一个无状态的、确定性的函数。其核心职责是：接收一个包含所有必要上下文的请求，并返回一份新生成的文档内容和一份修订摘要。

*   **输入 (Input):** 一个包含完整上下文的 `DocumentGenerationRequest` 对象。
*   **输出 (Output):** 一个包含新文档内容和元数据的 `DocumentGenerationResponse` 对象。
*   **无副作用 (Side-effect Free):** `L1-DP5` **不直接**与版本控制系统 (`L1-DP7`)、文件系统或任何其他持久化存储进行交互。它不负责获取其所需的上下文数据，也不负责存储其产出的结果。这些职责由其调用方（如 `L1-DP0`）和其他服务（如 `L1-DP2`, `L1-DP3`, `L1-DP7`）承担。这种设计确保了 `L1-DP5` 的高度独立性和可测试性。

**设计依据:**
*   《公理设计辅助系统 L1 公理设计文档 (V1.1)》 (FR5, DP5)
*   《软件用户需求文档 (URD) V1.6》 (§2.1, §7.3)
*   所有相关的 L1 Schema 规范文档 (项目模板, 词汇约束, 审查意见, 即时反馈批注)

#### **2. API 通用约定**

*   **主机地址 (Base URL):** 本规范不定义具体的主机地址。在实际部署中，应通过服务发现机制或配置文件来提供。所有路径均基于此 Base URL。
*   **API 版本:** API 版本通过 URL 路径进行标识。本规范定义的版本为 `v1`。
    *   示例: `https://<hostname>/api/v1/...`
*   **数据格式:** 所有请求体（`Request Body`）和响应体（`Response Body`）均使用 `application/json` 格式，并采用 `UTF-8` 编码。
*   **认证与授权:** 遵循系统统一规范。所有请求**必须**同时包含**身份标识**和**认证凭据**。
    *   **认证方式 (Authentication):** HTTP Header `Authorization: Bearer <system_component_token>`
    *   **身份标识 (Identification):** HTTP Header `X-System-Component-ID`
*   **错误处理:** API 使用标准的 HTTP 状态码。错误响应体应包含一个标准化的错误对象。

#### **3. 核心资源与数据模型**

##### **3.1. DocumentGenerationRequest (文档生成请求)**
这是一个综合性的请求对象，封装了 `L1-DP5` 执行任务所需的所有上下文信息。

```json
{
  "generation_mode": "string",
  "target_document_uri": "string (optional)",
  "current_content": "string (optional)",
  "context": {
    "llm_behavioral_style": "string",
    "upstream_documents": [
      {
        "uri": "string",
        "content": "string"
      }
    ],
    "lexicon_and_constraints": {
      "type": "object",
      "schema": "L1-DP2_LexiconConstraints_Schema (V1.2)"
    },
    "knowledge_fragments": [
      {
        "source": "string (URI)",
        "content": "string"
      }
    ],
    "review_feedback": {
      "type": "object",
      "optional": true,
      "schema": "L1-DP6_ReviewFeedback_Schema (V1.0) JSON mapping"
    },
    "priority_revisions": {
      "type": "object",
      "optional": true,
      "schema": "L1-DP8_PriorityRevisions_Schema (V1.1) JSON mapping"
    }
  }
}
```

*   `generation_mode` (string, enum, 必需): 生成模式。`FROM_SCRATCH` (从零撰写) 或 `REVISION` (修订)。
*   `target_document_uri` (string, 可选): 正在修订的文档的URI。在 `REVISION` 模式下必需。
*   `current_content` (string, 可选): 正在修订的文档的当前内容。在 `REVISION` 模式下必需。
*   `context` (object, 必需): 包含所有上下文信息的容器。
    *   `llm_behavioral_style` (string, 必需): 来自项目模板，定义了“撰写员”LLM的行为和风格。
    *   `upstream_documents` (array, 可选): 上游依赖文档的列表，每个对象包含其URI和完整内容。
    *   `lexicon_and_constraints` (object, 可选): 从 `L1-DP2` 获取的、完整的“项目词汇与约束”对象。
    *   `knowledge_fragments` (array, 可选): 从 `L1-DP3` 获取的相关知识片段列表。
    *   `review_feedback` (object, 可选): 来自 `L1-DP6` 的结构化审查意见。其JSON结构应精确映射自 `review_feedback.md` 的 Schema。仅在 `REVISION` 模式下提供。
    *   `priority_revisions` (object, 可选): 来自 `L1-DP8` 的、用户提供的即时反馈批注。其JSON结构应精确映射自 `priority_revisions.yaml` 的 Schema。仅在 `REVISION` 模式下提供。

##### **3.2. DocumentGenerationResponse (文档生成响应)**
这是 `L1-DP5` 成功执行后返回的对象。

```json
{
  "status": "string",
  "new_content": "string",
  "revision_summary": "string (Markdown)",
  "failure_reason": "string (optional)"
}
```

*   `status` (string, enum, 必需): `SUCCESS` 或 `FAILED`。
*   `new_content` (string): 当 `status` 为 `SUCCESS` 时，此字段包含新生成的完整文档内容 (Markdown 格式)。
*   `revision_summary` (string, Markdown): 当 `status` 为 `SUCCESS` 且 `generation_mode` 为 `REVISION` 时，此字段包含一份由 LLM 生成的、对本次修订的说明。该说明应明确回应审查意见中的每一项，便于 `L1-DP6` 进行下一轮审查。
*   `failure_reason` (string, 可选): 当 `status` 为 `FAILED` 时，此字段必须包含对失败原因的描述（例如，“无法解决审查意见中的关键冲突”）。

#### **4. 端点定义 (Endpoint Definition)**

遵循纯函数的设计哲学，系统仅需一个核心端点来处理所有内容生成和修订任务。

##### **POST /api/v1/documents/generate**
*   **描述:** 根据提供的完整上下文，执行一次文档生成或修订任务。这是一个同步的、计算密集型的操作。
*   **请求体:** `DocumentGenerationRequest` 对象。
*   **成功响应:**
    *   **状态码:** `200 OK`
    *   **响应体:** `DocumentGenerationResponse` 对象。即使内部LLM逻辑判定无法完成任务 (`status: FAILED`)，只要请求本身合法且被处理，API层面也应返回 `200 OK`，并将失败的细节体现在响应体中。
*   **错误响应:**
    *   `400 Bad Request`: 请求体不符合 `DocumentGenerationRequest` 的 Schema（例如，缺少必需字段）。
    *   `500 Internal Server Error`: `L1-DP5` 内部发生未预期的、无法处理的错误（例如，LLM服务本身不可用）。

#### **5. 示例：修订任务调用流程**

**背景:** `L1-DP0`（工作流控制器）需要 `L1-DP5` 修订一份L2设计文档。该修订需要同时考虑来自 `L1-DP6` 的正式审查意见和来自 `L1-DP8` 的用户即时批注。

1.  **上下文聚合:** `L1-DP0` (或其委托的上下文聚合器) 分别从 `L1-DP1`, `L1-DP2`, `L1-DP3`, `L1-DP7`, `L1-DP6`, `L1-DP8` 获取所有必需的数据。
2.  **构建请求:** `L1-DP0` 构建一个 `DocumentGenerationRequest` 对象。
3.  **API 调用:** `L1-DP0` 向 `L1-DP5` 发起 `POST /api/v1/documents/generate` 请求，请求体如下：

    ```json
    {
      "generation_mode": "REVISION",
      "target_document_uri": "vcs://project-alpha/docs/AD_L2_DP5_ContentEngine.md?commit=a1b2c3d4",
      "current_content": "# AD_L2_DP5_ContentEngine.md\n\n...",
      "context": {
        "llm_behavioral_style": "You are a meticulous system architect...",
        "upstream_documents": [
          {
            "uri": "vcs://project-alpha/docs/ADD_L1.md?commit=f4a3b2c1",
            "content": "# 公理设计辅助系统 L1 公理设计文档 (V1.1)\n\n..."
          }
        ],
        "lexicon_and_constraints": {
          "schemaVersion": "1.2",
          "lexicon": { "...": "..." }
        },
        "knowledge_fragments": [
          {
            "source": "file:///kb/architecture/functional-design.md",
            "content": "A pure function's return value is the same for the same arguments."
          }
        ],
        "review_feedback": {
          "review_id": "rev-20250608-x7y8z9",
          "overall_decision": "ARBITRATION_REQUIRED",
          "findings": [
            {
              "finding_id": "find-001",
              "severity": "CRITICAL",
              "description": "独立公理违反：L2设计矩阵显示FR2对DP3存在依赖...",
              "suggestion": "考虑创建一个新的L2-DP来处理..."
            }
          ]
        },
        "priority_revisions": {
          "targetDocumentUri": "vcs://project-alpha/docs/AD_L2_DP5_ContentEngine.md?commit=a1b2c3d4",
          "annotations": [
            {
              "annotationId": "prev-001",
              "comment": "请将'纯函数'这个概念在设计哲学部分进行更明确的阐述。"
            }
          ]
        }
      }
    }
    ```
4.  **处理与响应:** `L1-DP5` 接收请求，将其所有上下文整合后生成一个大的Prompt，调用内部的LLM。LLM执行修订，并生成新的内容和修订摘要。`L1-DP5` 封装后返回 `200 OK`，响应体如下：

    ```json
    {
      "status": "SUCCESS",
      "new_content": "# AD_L2_DP5_ContentEngine.md\n\n## 1. 设计哲学\n\n本API的设计严格遵循函数式编程思想，特别是'纯函数 (Pure Function)'的概念...\n\n### 4. L2 设计矩阵\n\n| FR / DP | DP1 | DP2 | DP_new | \n| :--- | :---: | :---: | :---: |\n| **FR1** | X | | |\n| **FR2** | O_d | X | |\n| **FR_new** | | | X |\n\n...",
      "revision_summary": "### 本次修订说明\n\n本次修订重点解决了审查意见和用户批注中的所有问题：\n\n1.  **回应用户批注 `prev-001`:** 在“设计哲学”一节中，增加了对“纯函数”概念的详细阐述。\n2.  **解决审查发现 `find-001` (CRITICAL):** 采纳了审查建议，对设计进行了重构。通过引入一个新的设计参数 `DP_new` 并将原 `FR2` 的部分功能拆分至新的 `FR_new`，成功消除了原设计矩阵中的耦合，使新矩阵符合独立公理。\n"
    }
    ```
5.  **后续步骤:** `L1-DP0` 接收到此响应后，会将 `new_content` 和 `revision_summary` 传递给 `L1-DP7` 服务，以创建一次新的Git提交，从而完成整个修订-提交的闭环。

---
Gemini 2.5 Pro 0605 writer