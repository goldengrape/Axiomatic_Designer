好的，遵照指示。

我已仔细阅读了《评审意见：关于<抽象知识库服务接口 (Abstract Knowledge Service Interface) 规范 (V1.0)>》。评审意见中的强制性修订项是准确且至关重要的。原设计在错误处理上的简化确实会掩盖根本性故障，而对 `context` 对象的模糊定义也确实会削弱接口的长期可用性。

我将根据评审意见中的所有强制性和建议性修订指令，对规范进行修订，生成 V1.1 版本。

---

### **抽象知识库服务接口 (Abstract Knowledge Service Interface) 规范 (V1.1)**

**状态:** **已批准 (Approved)**

**版本说明:** 本文档 (V1.1) 是对 V1.0 的修订版。此版本旨在解决 V1.0 评审报告中指出的两处关键设计缺陷。主要修订内容包括：
1.  **重构错误处理机制：** 引入了包含明确状态字段 (`status`) 的响应模型，以严格区分“成功但无结果”与“执行失败”这两种情况，防止关键故障被掩盖。
2.  **明确上下文结构：** 为 `RetrievalRequest.context` 对象定义了一组推荐的标准字段，以增强不同服务实现之间的互操作性。
3.  采纳了关于 `source` 字段格式的建议，推荐使用 URI。

#### **1. 引言**

本文档定义了“抽象知识库服务接口”。该接口是系统核心架构的关键组成部分，它将系统内部的功能逻辑（如 `L1-DP5` 内容生成引擎）与外部知识的具体存储方式（如文件系统、数据库、外部API）完全解耦。

`L1-DP3: 知识检索服务` 是此接口的**唯一调用方**。它的职责是根据当前任务上下文，通过调用此接口来获取相关信息。任何具体的知识库技术（例如，一个基于本地 `.md` 文件进行全文搜索的引擎，或一个连接到向量数据库的服务）都**必须**作为此接口的一个具体实现来提供。

本规范定义的是一个**抽象契约**，它规定了“做什么”（检索相关的知识片段），而非“如何做”（具体的检索算法或存储技术）。任何对此接口的具体实现，其自身的设计和实现文档都应作为本规范的下游文档。

**设计依据:**
*   《软件用户需求文档 (URD) V1.6》 (特别是 §1.4, §5.1)
*   《公理设计辅助系统 L1 公理设计文档 (V1.1)》
*   《项目代办事项列表 (V1.5)》

#### **2. 接口设计哲学**

*   **查询驱动 (Query-Driven):** 接口被设计为响应一个明确的查询，而非倾倒整个知识库。这确保了交互的高效性和目的性。
*   **上下文感知 (Context-Aware):** 接口的设计强调了上下文的重要性。调用者提供的上下文信息（如正在处理的文档、任务ID）是具体实现用以提升检索结果相关性的关键输入。
*   **无状态 (Stateless):** 接口的每一次调用都应是独立的、自包含的。服务实现不应依赖于先前调用的状态，这简化了服务实现和系统的可扩展性。
*   **片段化响应 (Fragment-Oriented):** 接口返回的是“知识片段”而非整个文档。这使得调用方（`L1-DP3`）能够将最相关、最简洁的信息注入到LLM的上下文中，从而优化性能和结果质量。

#### **3. 数据模型 (Data Models)**

##### **3.1. `KnowledgeFragment` (知识片段)**
这是接口返回的基本数据单元。

```json
{
  "source": "string (URI)",
  "content": "string",
  "retrieval_score": "number (float, 0.0 to 1.0)",
  "metadata": {
    "type": "object",
    "optional": true
  }
}
```

*   `source` (string, 必需): 知识片段的来源标识。必须是唯一的、可追溯的。为保证互操作性，**强烈推荐**使用统一资源标识符 (URI) 格式，例如：`file:///kb/database_best_practices.md`，`https://internal.wiki/page/ConnectionPooling`，或 `urn:kb:architecture:microservices`。
*   `content` (string, 必需): 检索到的信息文本本身。
*   `retrieval_score` (number, 必需): 相关性评分。一个介于 0.0 (不相关) 到 1.0 (完全相关) 之间的浮点数。此分数的计算逻辑由具体实现定义。
*   `metadata` (object, 可选): 一个键值对对象，用于携带额外的元数据。例如：`{"last_modified": "2024-05-20", "author": "system-architect-01"}`。

##### **3.2. `RetrievalRequest` (检索请求)**
这是调用接口时使用的输入数据结构。

```json
{
  "query": "string",
  "context": {
    "type": "object",
    "optional": true,
    "properties": {
      "source_document_uri": "string",
      "task_id": "string"
    }
  },
  "max_results": "integer"
}
```

*   `query` (string, 必需): 核心的检索查询字符串。例如：“如何实现数据库连接池？”
*   `context` (object, 可选): 提供关于查询背景的结构化信息。虽然此对象是可扩展的，以适应特定实现的需要，但**强烈建议**所有调用方提供以下标准字段，也**强烈建议**所有实现方优先利用这些字段来优化结果：
    *   `source_document_uri` (string): 正在处理的源文档的唯一URI。
    *   `task_id` (string): 触发本次检索的、当前正在执行的系统级任务的唯一标识符。
*   `max_results` (integer, 必需): 调用者期望返回的最大知识片段数量。

##### **3.3. `RetrievalResponse` (检索响应)**
这是接口成功或失败调用后返回的数据结构。它明确区分了操作状态和返回的数据。

```json
{
  "status": "string",
  "fragments": [
    { "$ref": "#/definitions/KnowledgeFragment" }
  ],
  "error_message": {
    "type": "string",
    "optional": true
  }
}
```

*   `status` (string, 必需): 操作的执行状态。枚举值必须为 `SUCCESS` 或 `FAILED`。
*   `fragments` (array, 必需): 一个 `KnowledgeFragment` 对象的数组。
    *   当 `status` 为 `SUCCESS` 时，此数组包含按 `retrieval_score` 从高到低排序的检索结果。若未找到任何结果，则返回空数组 `[]`。
    *   当 `status` 为 `FAILED` 时，此数组**必须**为空数组 `[]`。
*   `error_message` (string, 可选): 当 `status` 为 `FAILED` 时，此字段**必须**存在，并包含描述失败原因的、人类可读的错误信息。当 `status` 为 `SUCCESS` 时，此字段应被省略。

#### **4. 接口定义**

系统只定义一个核心方法。此接口可以被建模为单个函数调用或单个HTTP POST端点。

*   **方法/端点:** `retrieve_fragments`
*   **描述:** 根据给定的查询和上下文，从知识库中检索最相关的知识片段。
*   **输入:** `RetrievalRequest` 对象。
*   **输出:** 一个 `RetrievalResponse` 对象，其结构明确反映了操作的结果。
*   **错误处理:**
    *   **请求格式无效:** 如果请求格式无效（如缺少必需字段），服务实现应拒绝请求（例如，返回 HTTP 400 Bad Request）。此为传输层错误，不属于本接口定义的 `RetrievalResponse` 范围。
    *   **执行成功:** 如果查询执行成功（无论是否找到结果），服务实现**必须**返回一个 `status` 为 `SUCCESS` 的 `RetrievalResponse` 对象。如果未找到匹配片段，`fragments` 数组为空。
    *   **执行失败:** 如果在执行查询过程中遇到任何内部错误（如数据库连接失败、文件系统不可读、外部API认证失败等），服务实现**必须**返回一个 `status` 为 `FAILED` 的 `RetrievalResponse` 对象，并在 `error_message` 字段中提供具体的错误信息。
    *   **调用方责任:** 接口的调用方 (`L1-DP3`) **有责任**在处理响应前，必须首先检查 `status` 字段。如果状态为 `FAILED`，调用方必须采取适当的错误处理措施（如记录详细日志、向上游报告关键服务失败等），而不应继续其正常工作流程。

#### **5. 实现者须知**

*   **契约遵从:** 任何具体的知识库服务实现都**必须**严格遵循本规范定义的数据模型和接口行为，特别是关于 `RetrievalResponse` 中 `status` 字段的正确使用。
*   **评分逻辑:** `retrieval_score` 的计算逻辑是具体实现的核心。实现可以采用从简单的关键字匹配、TF-IDF，到复杂的语义向量搜索等任何技术。该逻辑应在具体实现的下游设计文档中明确说明。
*   **上下文利用:** 强烈建议具体实现利用 `context` 对象中的标准字段（如 `source_document_uri`, `task_id`）来过滤或重排结果。例如，如果上下文是“安全规范”，则包含“加密”一词的片段应获得比在通用上下文中更高的权重。
*   **性能:** 实现应被优化以提供低延迟的响应，因为它是系统核心工作流的关键路径。

#### **6. 示例：调用流程**

##### **场景 A: 成功检索**

**背景:** `L1-DP3: 知识检索服务` 收到来自 `L1-DP5` 的请求，后者正在撰写一篇关于“微服务架构中服务发现”的文档。

1.  `L1-DP3` 构建 `RetrievalRequest` 对象，使用新的标准 `context` 字段：

    ```json
    {
      "query": "service discovery patterns in microservices",
      "context": {
        "source_document_uri": "file:///workdir/AD_L2_GatewayService.md",
        "task_id": "task-20250605-decomp-l2-dp5"
      },
      "max_results": 3
    }
    ```

2.  `L1-DP3` 调用一个已配置的、实现了本接口的服务。

3.  该服务成功执行查询，并返回 `status` 为 `SUCCESS` 的 `RetrievalResponse` 对象：

    ```json
    {
      "status": "SUCCESS",
      "fragments": [
        {
          "source": "file:///kb/architecture/microservices.md#section-3.1",
          "content": "Client-side discovery pattern involves the client obtaining the location of all services from a Service Registry. The client then uses a load-balancing algorithm to select a suitable service instance and makes a request.",
          "retrieval_score": 0.92,
          "metadata": { "last_modified": "2024-03-15" }
        },
        {
          "source": "file:///kb/architecture/microservices.md#section-3.2",
          "content": "Server-side discovery pattern routes the client's request through a load balancer, which queries the Service Registry and forwards the request to an available service instance. This simplifies the client logic.",
          "retrieval_score": 0.88,
          "metadata": { "last_modified": "2024-03-15" }
        }
      ],
      "error_message": null
    }
    ```

4.  `L1-DP3` 接收此响应，首先检查 `status` 是否为 `SUCCESS`。确认后，将其中的 `fragments` 内容注入到提供给 `L1-DP5` 的上下文中。

##### **场景 B: 服务执行失败**

**背景:** 同上，但此时知识库服务依赖的数据库已下线。

1.  `L1-DP3` 发出与场景A完全相同的 `RetrievalRequest`。

2.  `L1-DP3` 调用该服务。

3.  服务实现尝试连接数据库失败。它**必须**捕获此内部错误，并返回 `status` 为 `FAILED` 的 `RetrievalResponse` 对象：

    ```json
    {
      "status": "FAILED",
      "fragments": [],
      "error_message": "Knowledge base 'kb_main' is offline: database connection refused on host 'db.internal:5432'."
    }
    ```

4.  `L1-DP3` 接收此响应，检查到 `status` 为 `FAILED`。它将**中止**向 `L1-DP5` 注入知识的流程，并向其调用者（`L1-DP0` 工作流控制器）报告关键依赖服务失败，同时记录 `error_message` 的内容到系统日志中。

---
Gemini 2.5 Pro 0605 writer