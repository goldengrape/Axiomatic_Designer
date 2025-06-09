好的，遵照指示。

我已收到并深入研究了《评审意见：关于<DP2_DP5.2 上下文聚合器 内部接口与逻辑定义 (V1.1)>》。V1.1 版本在L3详细设计层面存在若干逻辑黑盒和潜在的性能问题，使其在工程化之前必须被修正。

本次修订旨在彻底解决上述所有问题，产出一份逻辑完整、无歧义、性能优化、可直接指导工程实现的全新规范 (V1.2)。

核心修订内容包括：
1.  **形式化函数契约 (M-1, M-2):** 为所有在 V1.1 中未定义的关键辅助函数 (`extract_topic_from_fragment`, `calculate_similarity`, `analyze_diff_for_changes`, `find_context_in_doc`) 补充了明确的行为契约定义，消除了所有逻辑黑盒。
2.  **优化数据获取流程 (M-3):** 重构了主流程 `aggregateContext` 的伪代码，将文档内容的获取操作提前，消除了冗余的 I/O 调用风险，并保证了数据在流程中的一致性。
3.  **丰富异常处理模型 (R-1):** 采纳了建议，将异常模型从泛化的 `ContextAggregationException` 细化为更具体的 `ResourceNotFoundException` 和 `DependentServiceFailureException`，为上层调用者实现更精细的错误处理策略提供了支持。

以下是根据上述指令完成的 V1.2 修订版文档。

---

### **DP2_DP5.2 上下文聚合器 内部接口与逻辑定义 (V1.2)**

**状态:** 草案 (Draft)

**版本说明:** 本文档 (V1.2) 是对 V1.1 版本的**强制性修订**。此次修订旨在响应《评审意见》中指出的所有强制性修订指令 (M-1, M-2, M-3) 和建议性修订 (R-1)。核心变更包括：
1.  **形式化辅助函数契约:** 在附录中为 `extract_topic_from_fragment`, `calculate_similarity`, `analyze_diff_for_changes`, 和 `find_context_in_doc` 四个关键辅助函数补充了明确的逻辑和行为契约，消除了所有逻辑黑盒。
2.  **优化数据获取顺序:** 重构了主流程 `aggregateContext` 的逻辑，确保在“修订模式”下，目标文档内容只被获取一次，避免了冗余调用并保证了数据一致性。
3.  **细化异常处理模型:** 增强了异常处理机制，引入了更具体的异常类型，以支持上层实现更复杂的错误处理策略。

#### **1. 引言**

本文档详细定义了“内容生成与修订引擎”子系统内部的 `DP2_DP5.2: 上下文聚合器` 组件。根据 `ADD_L2_DP5` 的设计，该组件是连接“任务解析”与“内容生成”的关键环节，其核心职责是根据上游传入的“任务对象”，通过调用一系列L1服务接口，获取所有必需的上下文信息，并将其整合成一个标准的“上下文包”（Context Package）。

**设计依据:**
*   《公理设计辅助系统 L2 公理设计文档 (子系统：内容生成与修订引擎) (V1.0)》 (父级设计)
*   **《评审意见：关于<DP2_DP5.2 上下文聚合器 内部接口与逻辑定义 (V1.1)>》 (本次修订的核心驱动)**
*   所有相关的 L1 API 接口规范 (DP1, DP2, DP3, DP4, DP7, DP8) 及 Schema 规范
*   《项目代办事项列表 (V5.0)》

#### **2. 核心职责与设计哲学**

`DP2_DP5.2` 的设计遵循**确定性与无副作用 (Determinism & Side-effect Free)** 哲学。
*   **确定性 (Deterministic):** 本组件被设计为一个**无副作用的读取器 (Side-effect Free Reader)**。它不改变任何外部状态。其所有操作均为“读取”操作。纯函数的输出必须仅取决于其输入参数，而本组件的输出依赖于输入URI所指向的外部世界的内容。因此，为确保确定性，我们强调：**给定一组版本固定的输入URI，其输出是完全确定和可复现的。**
*   **无副作用 (Side-effect Free):** `DP2_DP5.2` 不直接操作文件系统或数据库，而是通过调用其他服务（如 `L1-DP7`）来间接获取数据。
*   **单一职责 (Single Responsibility):** 其唯一职责是“聚合上下文”。所有关于如何获取具体数据（如Git操作细节）的逻辑都被封装在被调用的L1服务中。
*   **依赖声明:** 本组件依赖一个标准库或子模块，该模块负责将 `review_feedback.md` 文件依据其 Schema 规范，确定性地解析为一个JSON对象。

#### **3. 接口定义 (Internal Interface)**

##### **`aggregateContext(taskObject: TaskObject) -> ContextPackage`**
*   **描述:** 接收一个 `TaskObject`，执行完整的上下文聚合流程，并返回一个 `ContextPackage`。
*   **输入:**
    *   `taskObject` (`TaskObject`): 一个包含所有资源URI和元数据的“购物清单”对象。
*   **输出:**
    *   一个 `ContextPackage` 对象。
*   **异常处理:** 参见第6节“错误处理机制”。

#### **4. 数据模型 (Data Models)**

##### **4.1. TaskObject (输入数据模型)**
与 V1.1 保持一致。

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

##### **4.2. ContextPackage (输出数据模型)**
与 V1.1 保持一致，结构与《L1-DP5 内容生成与修订引擎 API 接口规范》中的 `DocumentGenerationRequest.context` 保持一致。

```json
{
  "llmBehavioralStyle": "string",
  "upstreamDocuments": [
    { "uri": "string", "content": "string" }
  ],
  "lexiconAndConstraints": { /* ... L1-DP2 Schema ... */ },
  "knowledgeFragments": [
    { "source": "string (URI)", "content": "string" }
  ],
  "reviewFeedback": { /* ... L1-DP6 Schema JSON mapping ... */ },
  "priorityRevisions": {
    "applicableAnnotations": [
      { "annotationId": "string", "comment": "string", "locatedContext": "string" }
    ],
    "staleAnnotations": [
      { "annotationId": "string", "reason": "string", "confidence": "number" }
    ]
  }
}
```

#### **5. 核心处理逻辑 (Core Processing Logic)**

以下是 `aggregateContext` 函数必须遵循的、经过修订的伪代码逻辑。

```
Function aggregateContext(task: TaskObject) -> ContextPackage {

  // [M-3] 优化：如果是修订模式，在所有操作之前先获取一次当前文档内容
  currentDocContent = null;
  if (task.generationMode == "REVISION") {
    currentDocContent = call_L1_DP7_getContent(task.targetDocumentUri);
    // 如果获取失败，L1-DP7的调用封装会抛出异常，函数提前终止
  }

  // 步骤 1: 获取基础配置 (模板和词汇)
  templateContent = call_L1_DP7_getContent(task.contextUris.templateUri);
  lexiconContent = call_L1_DP7_getContent(task.contextUris.lexiconUri);
  template = JSON.parse(templateContent);
  lexicon = JSON.parse(lexiconContent);

  // 步骤 2: 获取基础知识 (来自知识库)
  query = "Information related to document context: " + (task.targetDocumentUri || "new document");
  retrievalRequest = { query: query, max_results: 10 };
  retrievalResponse = call_L1_DP3_retrieveFragments(retrievalRequest);
  
  // 步骤 3: 解决知识冲突
  finalKnowledgeFragments = resolve_knowledge_conflicts(lexicon, retrievalResponse.fragments);

  // 步骤 4: 获取上游文档内容
  upstreamDocuments = [];
  for (uri in task.contextUris.upstreamDocumentUris) {
    content = call_L1_DP7_getContent(uri);
    upstreamDocuments.push({ uri: uri, content: content });
  }

  // 步骤 5: 如果是修订模式，获取并处理修订相关的上下文
  reviewFeedback = null;
  priorityRevisions = null;
  
  if (task.generationMode == "REVISION") {
    // 获取审查意见
    if (task.contextUris.reviewFeedbackUri) {
      feedbackContent = call_L1_DP7_getContent(task.contextUris.reviewFeedbackUri);
      reviewFeedback = parse_reviewFeedback_md_to_json(feedbackContent); 
    }
    
    // 获取并处理即时反馈批注
    if (task.contextUris.priorityRevisionsUri) {
      revisionsContent = call_L1_DP7_getContent(task.contextUris.priorityRevisionsUri);
      revisionsYaml = YAML.parse(revisionsContent);
      
      // [M-3] 直接使用在函数入口处获取的 currentDocContent
      priorityRevisions = process_priority_revisions(revisionsYaml, currentDocContent);
    }
  }

  // 步骤 6: 组装最终的 ContextPackage
  contextPackage = {
    llmBehavioralStyle: template.componentSettings.dp5.llmConfig.behavioralStyle,
    upstreamDocuments: upstreamDocuments,
    lexiconAndConstraints: lexicon,
    knowledgeFragments: finalKnowledgeFragments,
    reviewFeedback: reviewFeedback,
    priorityRevisions: priorityRevisions
  };
  
  return contextPackage;
}
```

##### **5.1. 附录：核心算法详细定义**
与 V1.1 保持一致。

###### **`resolve_knowledge_conflicts`**```
Function resolve_knowledge_conflicts(lexicon, knowledgeFragments) -> List<Fragment> {
    
    // 1. 收集与分组: 按主题（术语）将所有信息源分组
    knowledgeMapByTopic = new Map();

    // 从 L1-DP2 (词汇表) 收集
    for (term in lexicon.lexicon.glossary) {
        topic = term;
        unit = { source_component: "L1-DP2", content: lexicon.lexicon.glossary[term].definition };
        if (!knowledgeMapByTopic.has(topic)) knowledgeMapByTopic.set(topic, []);
        knowledgeMapByTopic.get(topic).push(unit);
    }

    // 从 L1-DP3 (知识库) 收集
    for (fragment in knowledgeFragments) {
        // [M-1] 此处调用行为已在附录 5.2 中明确定义
        topic = extract_topic_from_fragment(fragment); 
        unit = { source_component: "L1-DP3", content: fragment.content };
        if (!knowledgeMapByTopic.has(topic)) knowledgeMapByTopic.set(topic, []);
        knowledgeMapByTopic.get(topic).push(unit);
    }

    // 2. 识别、仲裁与整合
    finalFragments = [];
    for ([topic, units] of knowledgeMapByTopic) {
        if (units.length == 1) {
            finalFragments.push(units[0]);
        } else {
            request = { topic: topic, units: units };
            response = call_L1_DP4_arbitrate(request);
            if (response.winning_unit != null) {
                finalFragments.push(response.winning_unit);
            }
        }
    }
    
    return finalFragments;
}
```

###### **`process_priority_revisions`**
```
Function process_priority_revisions(revisionsYaml, currentDocContent) -> ResultObject {
    
    applicable = [];
    stale = [];
    
    config = { w_e: 0.6, w_p: 0.2, w_s: 0.2, threshold: 0.9 };
    
    for (annotation in revisionsYaml.annotations) {
        
        baselineUri = revisionsYaml.targetDocumentUri;
        baselineContent = call_L1_DP7_getContent(baselineUri);
        
        // [M-2] 以下辅助函数的行为契约已在附录 5.2 中明确定义
        Score_exact = calculate_similarity(baselineContent, annotation.anchor.exact);
        Score_prefix = calculate_similarity(..., annotation.anchor.prefix);
        Score_suffix = calculate_similarity(..., annotation.anchor.suffix);
        
        Confidence = (config.w_e * Score_exact) + (config.w_p * Score_prefix) + (config.w_s * Score_suffix);
        
        if (Confidence < config.threshold) {
            stale.push({ annotationId: annotation.annotationId, reason: "POSITIONING_FAILED", confidence: Confidence });
            continue;
        }
        
        diff = call_L1_DP7_getDiff(baselineUri, task.targetDocumentUri); 
        anchorAreaChanged = analyze_diff_for_changes(diff, located_position_in_baseline);

        if (anchorAreaChanged) {
            stale.push({ annotationId: annotation.annotationId, reason: "CONTENT_DRIFT", confidence: Confidence });
        } else {
            locatedContextInCurrentDoc = find_context_in_doc(currentDocContent, annotation.anchor);
            applicable.push({ 
                annotationId: annotation.annotationId, 
                comment: annotation.comment, 
                locatedContext: locatedContextInCurrentDoc 
            });
        }
    }
    
    return {
        applicableAnnotations: applicable,
        staleAnnotations: stale
    };
}
```

##### **5.2. 附录：核心辅助函数行为契约 (M-1, M-2 实现)**

###### **`extract_topic_from_fragment(fragment: KnowledgeFragment) -> string`**
*   **输入:** 一个 `KnowledgeFragment` 对象。
*   **输出:** 一个代表该片段主题的字符串 `topic`。
*   **逻辑契约:**
    1.  函数**必须**首先检查 `fragment.metadata` 对象中是否存在一个名为 `topic` 的字段。如果存在且其值为非空字符串，则**必须**直接返回该值。
    2.  如果元数据中没有 `topic` 字段，函数**应该**对 `fragment.content` 应用标准的自然语言处理（NLP）关键字提取算法，并返回得分最高的关键字作为 `topic`。
    3.  如果以上步骤均未产生结果，函数**必须**返回一个空字符串 `""`。

###### **`calculate_similarity(full_text: string, substring: string) -> number`**
*   **输入:** 完整的文档文本 `full_text` 和一个待查找的子字符串 `substring`。
*   **输出:** 一个 `[0.0, 1.0]` 区间的浮点数，表示相似度得分。
*   **逻辑契约:** 函数负责在 `full_text` 中找到与 `substring` 最相似的片段，并返回一个归一化的相似度得分（例如，基于 Levenshtein 距离）。返回 `1.0` 代表完全匹配。

###### **`analyze_diff_for_changes(diff: DiffObject, located_position: Range) -> boolean`**
*   **输入:** 一个由 `L1-DP7` 服务产生的 `diff` 对象，以及一个表示锚点在**基准文档**中位置的范围对象 `located_position` (例如，包含起始和结束字符索引)。
*   **输出:** 一个布尔值。
*   **逻辑契约:** 函数负责分析 `diff` 对象。如果 diff 中记录的任何“删除”或“修改”操作与 `located_position` 的范围存在重叠，则函数**必须**返回 `true`。否则，返回 `false`。

###### **`find_context_in_doc(doc_content: string, anchor: Anchor) -> string`**
*   **输入:** **当前**待修订文档的全文 `doc_content` 和一个 `anchor` 对象。
*   **输出:** 一个字符串，表示在当前文档中定位到的、包含锚点及其周围上下文的实际文本。
*   **逻辑契约:** 函数负责在 `doc_content` 中定位 `anchor.exact` 的最佳匹配位置，并返回该位置及其前后一定范围内的文本作为实际上下文。

#### **6. 错误处理机制 (Error Handling Mechanism) (R-1 实现)**

为实现更精细的错误处理，本组件的异常模型被细化。`aggregateContext` 函数在遇到错误时，**必须**抛出以下更具体的异常类型之一：

*   **`ResourceNotFoundException`:**
    *   **触发条件:** 当调用任何L1服务（如 `L1-DP7`）获取一个必要的资源URI时，服务返回了 `404 Not Found` 或等效的“未找到”错误。
    *   **目的:** 允许上层调用者（`L2-DP0`）区分“永久性失败”（资源确实不存在）和“暂时性失败”，从而采取不同的策略（例如，直接中止任务并报告错误）。

*   **`DependentServiceFailureException`:**
    *   **触发条件:** 当调用任何L1服务时，服务返回了 `5xx` 系列的服务器错误（如 `500 Internal Server Error`, `503 Service Unavailable`）。
    *   **目的:** 允许上层调用者识别出这是依赖服务本身的故障，而不是请求数据的问题。这可以触发如“重试”或“熔断”等更复杂的容错策略。

*   **`ContextAggregationException`:**
    *   **触发条件:** 用于其他所有在聚合过程中发生的、非特定于服务调用的错误。例如，获取到的文件内容无法被正确解析为有效的 JSON 或 YAML。
    *   **目的:** 作为捕获其他所有内部逻辑错误的标准异常类型。

所有异常对象都**必须**包含详细的错误信息，包括失败的资源URI（如果适用）和来自下游服务的原始错误消息。

---
Gemini 2.5 Pro 0605 writer