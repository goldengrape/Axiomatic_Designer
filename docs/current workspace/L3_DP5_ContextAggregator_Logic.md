好的，遵照《项目代办事项列表 (V5.0)》中定义的任务顺序，我将开始执行下一项工作。

**当前任务:**
*   **任务ID:** `TODO-L3-DP5-001`
*   **任务描述:** 撰写《DP2_DP5.2 上下文聚合器 内部接口与逻辑定义》。本文档需详细定义 `DP2_DP5.2` 如何调用L1服务接口 (DP1, DP2, DP3, DP4, DP8)，以及如何将获取的数据聚合为标准的“上下文包”对象。
*   **前置条件:** `ADD_L2_DP5` 已冻结。

我将基于 `ADD_L2_DP5 Freezed.md` 中对 `DP2_DP5.2` 的职责定义，并参考所有相关的L1 API接口规范，撰写一份详细的L3层级内部逻辑定义文档。

以下是本次工作的产出文档。

---

### **DP2_DP5.2 上下文聚合器 内部接口与逻辑定义 (V1.0)**

**状态:** 草案

**版本说明:** 本文档 (V1.0) 是对 `ADD_L2_DP5` 中定义的L2设计参数 `DP2_DP5.2: 上下文聚合器` 的首次L3层级详细设计。其目的是将该组件的职责形式化为清晰的接口、数据模型和处理逻辑，为后续的工程实现提供一个无歧义的蓝图。

#### **1. 引言**

本文档详细定义了“内容生成与修订引擎”子系统内部的 `DP2_DP5.2: 上下文聚合器` 组件。根据 `ADD_L2_DP5` 的设计，该组件是连接“任务解析”与“内容生成”的关键环节，其核心职责是根据上游传入的“任务对象”，通过调用一系列L1服务接口，获取所有必需的上下文信息，并将其整合成一个标准的“上下文包”（Context Package）。

**设计依据:**
*   《公理设计辅助系统 L2 公理设计文档 (子系统：内容生成与修订引擎) (V1.0)》 (父级设计)
*   所有相关的 L1 API 接口规范 (DP1, DP2, DP4, DP7, DP8) 及 Schema 规范
*   《项目代办事项列表 (V5.0)》

#### **2. 核心职责与设计哲学**

`DP2_DP5.2` 的设计严格遵循**无副作用的纯函数 (Side-effect Free Pure Function)** 哲学。
*   **输入 (Input):** 一个包含所有必需资源引用（URI）的 `TaskObject`。
*   **输出 (Output):** 一个包含所有实际数据内容的 `ContextPackage`。
*   **无副作用 (Side-effect Free):** `DP2_DP5.2` **不**改变任何外部状态。其所有操作均为“读取”操作（通过API调用）。它不直接操作文件系统或数据库，而是通过调用其他服务（如 `L1-DP7`）来间接获取数据。
*   **单一职责 (Single Responsibility):** 其唯一职责是“聚合上下文”。所有关于如何获取具体数据（如Git操作细节）的逻辑都被封装在被调用的L1服务中。

#### **3. 接口定义 (Internal Interface)**

`DP2_DP5.2` 对其调用方（`L2-DP0` 工作流控制器）暴露一个单一的、同步的函数接口。

##### **`aggregateContext(taskObject: TaskObject) -> ContextPackage`**
*   **描述:** 接收一个 `TaskObject`，执行完整的上下文聚合流程，并返回一个 `ContextPackage`。
*   **输入:**
    *   `taskObject` (`TaskObject`): 一个包含所有资源URI和元数据的“购物清单”对象。
*   **输出:**
    *   一个 `ContextPackage` 对象。
*   **异常处理:** 如果在聚合过程中任何一个关键的L1服务调用失败（例如，返回 `404 Not Found` 或 `500 Internal Server Error`），此函数**必须**向上抛出一个明确的、可捕获的异常（如 `ContextAggregationException`），并附带详细的失败原因。

#### **4. 数据模型 (Data Models)**

##### **4.1. TaskObject (输入数据模型)**
这是由上游 `DP2_DP5.1` (任务指令解析器) 生成的，作为本组件输入的“任务对象”。

```json
{
  "generationMode": "string (enum: FROM_SCRATCH, REVISION)",
  "targetDocumentUri": "string (optional, a versioned VCS URI)",
  "contextUris": {
    "templateUri": "string (a versioned VCS URI)",
    "lexiconUri": "string (a versioned VCS URI)",
    "upstreamDocumentUris": ["string (a versioned VCS URI)"],
    "reviewFeedbackUri": "string (optional, a versioned VCS URI)",
    "priorityRevisionsUri": "string (optional, a versioned VCS URI)"
  }
}
```
*   `generationMode` (string, 必需): 生成模式。
*   `targetDocumentUri` (string, 可选): 正在修订的文档的URI。在 `REVISION` 模式下必需。
*   `contextUris` (object, 必需): 一个包含所有上下文资源URI的容器。

##### **4.2. ContextPackage (输出数据模型)**
这是聚合完成后，传递给下游 `DP2_DP5.3` (LLM引擎) 的“上下文包”。其结构与《L1-DP5 内容生成与修订引擎 API 接口规范》中的 `DocumentGenerationRequest.context` 保持一致。

```json
{
  "llmBehavioralStyle": "string",
  "upstreamDocuments": [
    {
      "uri": "string",
      "content": "string"
    }
  ],
  "lexiconAndConstraints": {
    "type": "object",
    "schema": "L1-DP2_LexiconConstraints_Schema (V1.2)"
  },
  "knowledgeFragments": [
    {
      "source": "string (URI)",
      "content": "string"
    }
  ],
  "reviewFeedback": {
    "type": "object",
    "optional": true,
    "schema": "L1-DP6_ReviewFeedback_Schema (V1.0) JSON mapping"
  },
  "priorityRevisions": {
    "type": "object",
    "optional": true,
    "properties": {
      "applicableAnnotations": [
        {
          "annotationId": "string",
          "comment": "string",
          "locatedContext": "string"
        }
      ],
      "staleAnnotations": [
        {
          "annotationId": "string",
          "reason": "string",
          "confidence": "number"
        }
      ]
    }
  }
}
```

#### **5. 核心处理逻辑 (Core Processing Logic)**

以下是 `aggregateContext` 函数必须遵循的伪代码逻辑。

```
Function aggregateContext(task: TaskObject) -> ContextPackage {
  
  // 步骤 1: 获取基础配置 (模板和词汇)
  // 调用 L1-DP7 获取模板和词汇文件的内容
  templateContent = call_L1_DP7_getContent(task.contextUris.templateUri);
  lexiconContent = call_L1_DP7_getContent(task.contextUris.lexiconUri);
  
  // 解析 JSON 内容
  template = JSON.parse(templateContent);
  lexicon = JSON.parse(lexiconContent);

  // 步骤 2: 获取基础知识 (来自知识库)
  // 使用目标文档的标题或摘要作为查询
  query = "Information related to " + task.targetDocumentUri;
  retrievalRequest = { query: query, max_results: 10 };
  
  // 调用 L1-DP3 抽象接口获取知识片段
  retrievalResponse = call_L1_DP3_retrieveFragments(retrievalRequest);
  
  // 步骤 3: 解决知识冲突
  // 将来自词汇表(DP2)和知识库(DP3)的信息进行仲裁
  // (此处的具体实现是虚构的，实际需要遍历所有潜在冲突点)
  conflictingUnits = [
    { source_component: "L1-DP2", content: lexicon.glossary["FR"] },
    { source_component: "L1-DP3", content: retrievalResponse.fragments[0] }
  ];
  arbitratedFragments = call_L1_DP4_arbitrate(conflictingUnits);
  
  // 步骤 4: 获取上游文档内容
  upstreamDocuments = [];
  for (uri in task.contextUris.upstreamDocumentUris) {
    content = call_L1_DP7_getContent(uri);
    upstreamDocuments.push({ uri: uri, content: content });
  }

  // 步骤 5: 如果是修订模式，获取修订相关的上下文
  reviewFeedback = null;
  priorityRevisions = null;
  
  if (task.generationMode == "REVISION") {
    // 获取审查意见
    if (task.contextUris.reviewFeedbackUri) {
      feedbackContent = call_L1_DP7_getContent(task.contextUris.reviewFeedbackUri);
      // 将 review_feedback.md 的内容解析为JSON对象
      reviewFeedback = parse_reviewFeedback_md_to_json(feedbackContent);
    }
    
    // 获取并处理即时反馈批注
    if (task.contextUris.priorityRevisionsUri) {
      revisionsContent = call_L1_DP7_getContent(task.contextUris.priorityRevisionsUri);
      revisionsYaml = YAML.parse(revisionsContent);
      
      // 获取当前待修订文档的内容，用于锚点定位
      currentDocContent = call_L1_DP7_getContent(task.targetDocumentUri);
      
      // 执行在《L1-DP8_PriorityRevisions_Schema》中定义的健壮锚点定位算法
      priorityRevisions = process_priority_revisions(revisionsYaml, currentDocContent);
    }
  }

  // 步骤 6: 组装最终的 ContextPackage
  contextPackage = {
    llmBehavioralStyle: template.componentSettings.dp5.llmConfig.behavioralStyle,
    upstreamDocuments: upstreamDocuments,
    lexiconAndConstraints: lexicon,
    knowledgeFragments: arbitratedFragments, // 使用仲裁后的结果
    reviewFeedback: reviewFeedback,
    priorityRevisions: priorityRevisions
  };
  
  return contextPackage;
}
```

#### **6. 错误处理机制 (Error Handling Mechanism)**

*   **服务调用失败:** 任何对 L1 服务的 API 调用（如 `call_L1_DP7_getContent`）如果失败（例如，返回非 2xx 状态码），`aggregateContext` 函数必须立即停止执行，并向上层调用者（`L2-DP0`）抛出一个包含失败原因和源服务信息的 `ContextAggregationException` 异常。
*   **内容解析失败:** 如果获取到的文件内容（如模板、词汇）无法被正确解析（如无效的 JSON/YAML），函数也必须抛出 `ContextAggregationException` 异常，指明解析失败的文件URI和错误详情。

---
Gemini 2.5 Pro 0605 writer