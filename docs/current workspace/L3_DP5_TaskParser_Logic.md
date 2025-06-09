好的，遵照指示。

基于已冻结的L2设计文档 `ADD_L2_DP5 Freezed.md`，我们现在开始对L2层级的设计参数 `L2 DP1: 任务指令解析器` 进行L3层级的详细逻辑设计。

本文档将定义该组件的内部接口、数据模型、核心处理逻辑及错误处理机制，旨在为后续的工程化实现提供一份清晰、无歧义的规范。

---

### **DP1_DP5.1 任务指令解析器 内部接口与逻辑定义 (V1.0)**

**状态:** 草案 (Draft)

**版本说明:** 本文档 (V1.0) 是对 `L2 DP1: 任务指令解析器` 的首次L3层级详细设计。其核心目标是将L2设计中定义的组件职责，细化为具体的函数接口、数据结构和处理算法，确保其实现是确定性、无副作用且可测试的。

#### **1. 引言**

本文档详细定义了“内容生成与修订引擎”子系统内部的第一个关键组件：`DP1_DP5.1: 任务指令解析器`。根据父级设计文档《公理设计辅助系统 L2 公理设计文档 (子系统：内容生成与修订引擎) (V1.0)》，该组件是整个内容生成流水线的入口。

其核心职责（源自 `L2 FR1: 解析任务指令`）是：接收来自上层协调器（如 `L1-DP0`）的、描述了高级意图的指令，并将其解析、验证、转换为一个标准的、机器可读的“任务对象”（Task Object）。这个“任务对象”将作为下游组件 `L2-DP2: 上下文聚合器` 的唯一输入。

**设计依据:**
*   《公理设计辅助系统 L2 公理设计文档 (子系统：内容生成与修订引擎) (V1.0)》 (父级设计)
*   《L1-DP0 工作流状态机定义文档 (V1.1)》 (指令的来源与上下文)
*   《L3_DP5_ContextAggregator_Logic Freezed.md》 (下游组件的输入契约)
*   《软件用户需求文档 (URD) V1.6》

#### **2. 核心职责与设计哲学**

`DP1_DP5.1` 的设计严格遵循**纯函数转换 (Pure Function Transformation)** 的哲学。

*   **确定性 (Deterministic):** 本组件必须是一个纯粹的转换器。对于任何给定的输入 `CommandObject`，它必须始终产生完全相同的输出 `TaskObject`。
*   **无副作用 (Side-effect Free):** 本组件严禁执行任何I/O操作（如读写文件、网络请求）。它不调用任何其他服务，其唯一功能是对输入数据进行结构转换和验证。
*   **单一职责 (Single Responsibility):** 其唯一职责是“解析指令”。所有关于“如何执行任务”（如获取上下文、调用LLM）的逻辑都属于下游组件。本组件仅负责定义“需要执行什么任务”。
*   **契约守卫 (Contract Guardian):** 本组件是内容生成流水线的“守卫”。它负责验证上游传入指令的完整性和有效性，确保只有合法的指令才能进入后续处理流程。

#### **3. 接口定义 (Internal Interface)**

##### **`parseTask(command: CommandObject) -> TaskObject`**
*   **描述:** 这是该组件唯一暴露的公共函数。它接收一个来自上层控制器的 `CommandObject`，执行解析和验证，并返回一个符合下游组件契约的 `TaskObject`。
*   **输入:**
    *   `command` (`CommandObject`): 一个封装了高级任务指令及其所需全部资源定位符（URI）的对象。
*   **输出:**
    *   一个 `TaskObject` 对象。
*   **异常处理:** 当输入 `command` 不符合预设的契约时，函数将抛出 `InvalidCommandException`。参见第6节“错误处理机制”。

#### **4. 数据模型 (Data Models)**

##### **4.1. CommandObject (输入数据模型)**
这是从 `L1-DP0` 等上层控制器传入的、结构化的指令载荷。

```json
{
  "commandType": "string (enum: CREATE_NEW_DOC, REVISE_DOC)",
  "targetDocumentUri": "string (a versioned VCS URI for the document to be created/revised)",
  "baseContextUris": {
    "templateUri": "string (a versioned VCS URI for the project template)",
    "lexiconUri": "string (a versioned VCS URI for the project lexicon)"
  },
  "referenceContextUris": {
    "upstreamDocumentUris": ["string (list of versioned VCS URIs)"],
    "reviewFeedbackUri": "string (optional, a versioned VCS URI)",
    "priorityRevisionsUri": "string (optional, a versioned VCS URI)"
  }
}
```

##### **4.2. TaskObject (输出数据模型)**
这是经过解析和验证后，输出给下游 `L2-DP2` 的标准任务对象。此模型与 `L3_DP5_ContextAggregator_Logic Freezed.md` 中定义的输入模型完全一致，以确保组件间的无缝衔接。

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

#### **5. 核心处理逻辑 (Core Processing Logic)**

以下是 `parseTask` 函数必须遵循的伪代码逻辑。

```
Function parseTask(command: CommandObject) -> TaskObject {

  // 步骤 1: 验证输入指令对象的通用字段
  if (!command.commandType || !command.targetDocumentUri || !command.baseContextUris) {
    throw new InvalidCommandException("CommandObject is missing one or more root fields: commandType, targetDocumentUri, baseContextUris.");
  }
  if (!command.baseContextUris.templateUri || !command.baseContextUris.lexiconUri) {
    throw new InvalidCommandException("baseContextUris is missing templateUri or lexiconUri.");
  }

  // 步骤 2: 根据指令类型进行特定验证和逻辑分支
  let generationMode;
  let reviewFeedbackUri = null;
  let priorityRevisionsUri = null;

  switch (command.commandType) {
    case "CREATE_NEW_DOC":
      // 在“从零创建”模式下，不应提供修订相关的上下文
      if (command.referenceContextUris.reviewFeedbackUri || command.referenceContextUris.priorityRevisionsUri) {
        throw new InvalidCommandException("CREATE_NEW_DOC command must not contain reviewFeedbackUri or priorityRevisionsUri.");
      }
      generationMode = "FROM_SCRATCH";
      break;

    case "REVISE_DOC":
      // 在“修订”模式下，必须提供审查意见或即时批注之一
      if (!command.referenceContextUris.reviewFeedbackUri && !command.referenceContextUris.priorityRevisionsUri) {
        throw new InvalidCommandException("REVISE_DOC command must provide at least one of reviewFeedbackUri or priorityRevisionsUri.");
      }
      generationMode = "REVISION";
      reviewFeedbackUri = command.referenceContextUris.reviewFeedbackUri;
      priorityRevisionsUri = command.referenceContextUris.priorityRevisionsUri;
      break;

    default:
      throw new InvalidCommandException(`Unknown commandType: '${command.commandType}'.`);
  }

  // 步骤 3: 映射和组装最终的 TaskObject
  // 此处进行显式的字段映射，将输入契约转换为输出契约，即便结构相似。
  // 这样做可以隔离变化：如果未来输入或输出模型之一发生变化，只需修改此处的映射逻辑。
  taskObject = {
    generationMode: generationMode,
    targetDocumentUri: command.targetDocumentUri,
    contextUris: {
      templateUri: command.baseContextUris.templateUri,
      lexiconUri: command.baseContextUris.lexiconUri,
      upstreamDocumentUris: command.referenceContextUris.upstreamDocumentUris || [], // 确保永远是数组
      reviewFeedbackUri: reviewFeedbackUri,
      priorityRevisionsUri: priorityRevisionsUri
    }
  };
  
  // 步骤 4: 返回标准化的任务对象
  return taskObject;
}
```

#### **6. 错误处理机制 (Error Handling Mechanism)**

为了保证流水线的健壮性，本组件的错误处理机制必须是严格且明确的。

*   **`InvalidCommandException`:**
    *   **触发条件:** 当且仅当输入的 `CommandObject` 在结构上或逻辑上不符合 `parseTask` 函数内部定义的契约时，**必须**抛出此异常。
        *   **结构性错误示例:** 缺少必要的字段，如 `command.commandType` 为 `null`。
        *   **逻辑性错误示例:** `commandType` 为 `CREATE_NEW_DOC`，但却提供了 `reviewFeedbackUri`。
    *   **异常载荷:** 此异常对象**必须**包含一个人类可读的、详细的错误信息字符串，明确指出验证失败的原因。例如：`"REVISE_DOC command must provide at least one of reviewFeedbackUri or priorityRevisionsUri."`。
    *   **目的:** 允许上层调用者（如 `L2-DP0` 或其父级 `L1-DP0`）捕获此异常，并理解其指令构建逻辑存在缺陷。这对于调试系统级的状态转换和工作流至关重要，因为它能精确定位错误的源头——即指令的生成方，而非指令的执行方。

---
Gemini 2.5 Pro 0605 writer