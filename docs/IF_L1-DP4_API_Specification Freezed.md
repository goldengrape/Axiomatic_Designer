好的，遵照指示。

我将根据《项目代办事项列表 (V1.8)》中的待办事项，开始执行下一项工作：**撰写《L1-DP4 知识仲裁器 API 接口规范》**。

这份文档将定义 `L1-DP4` 作为一个独立组件的交互契约。它将形式化该模块的输入（一组可能冲突的信息源）和输出（一个经过仲裁的、一致的信息单元）的数据结构，使其可以被系统中的其他组件（如 `L1-DP5` 和 `L1-DP6`）以一种标准化的方式调用。

以下是本次工作的产出文档。

---

### **L1-DP4 知识仲裁器 API 接口规范 (V1.0)**

**状态:** 已批准(approved)

**版本说明:** 本文档 (V1.0) 是该 API 规范的初版。其目的是为 `L1-DP4: 知识仲裁器` 组件定义一个清晰、标准化的交互接口。该接口将《L1-DP4 知识冲突仲裁逻辑规则定义 (V1.0)》中形式化的逻辑封装成一个可供调用的服务。

#### **1. 引言**

本文档定义了 `L1-DP4: 知识仲裁器` 的应用程序编程接口（API）。`L1-DP4` 的唯一职责是解决来自不同内部知识源的信息冲突。此 API 规范定义了调用方如何向仲裁器提交一组可能冲突的信息，以及如何接收经过仲裁后的、唯一的、权威的决策结果。

**设计目标:**
*   **标准化:** 提供一个稳定的、定义良好的接口，将仲裁逻辑与调用方（如 `L1-DP5` 内容生成引擎）解耦。
*   **简单性:** 接口设计应尽可能简单，反映其作为单一职责纯函数的本质。
*   **确定性:** 对于任何给定的输入，输出必须是完全可预测的，严格遵循已批准的仲裁逻辑。

**设计依据:**
*   **《L1-DP4 知识冲突仲裁逻辑规则定义 (V1.0)》 (核心逻辑)**
*   《公理设计辅助系统 L1 公理设计文档 (V1.1)》
*   《项目代办事项列表 (V1.8)》

#### **2. 接口设计哲学与实现假设**

*   **同步函数调用 (Synchronous Function Call):** `L1-DP4` 被设计为一个**无状态的、纯粹的逻辑组件**。因此，其 API 最适合被实现为一个简单的、同步的函数或方法调用，而不是一个网络服务（如 RESTful API）。本规范将以函数签名的形式进行定义，其数据模型则以 JSON 结构进行说明，以便于跨语言实现。
*   **无状态 (Stateless):** 每次调用都是独立的。仲裁器不应依赖于任何先前的调用历史或外部状态。
*   **不可知性 (Agnostic):** 仲裁器不关心信息的主题或内容本身，它只关心信息单元的 `source_component` 标识符，并据此应用优先级规则。

#### **3. 数据模型 (Data Models)**

##### **3.1. `ConflictingInformationUnit` (冲突信息单元)**
这是提交给仲裁器的基本信息单元。

```json
{
  "source_component": "string",
  "content": "string",
  "metadata": {
    "type": "object",
    "optional": true
  }
}
```

*   `source_component` (string, 必需): 信息的来源组件标识。其值必须是系统中已知的、会产生知识冲突的组件ID。有效值包括：
    *   `"L1-DP2"` (来自项目词汇服务)
    *   `"L1-DP3"` (来自知识检索服务)
*   `content` (string, 必需): 信息单元的文本内容。
*   `metadata` (object, 可选): 一个键值对对象，用于携带原始的元数据，仲裁器会将其原样传递给获胜的单元。

##### **3.2. `ArbitrationRequest` (仲裁请求)**
这是调用仲裁接口时使用的输入数据结构。

```json
{
  "topic": "string",
  "units": [
    { "$ref": "#/definitions/ConflictingInformationUnit" }
  ]
}
```

*   `topic` (string, 必需): 描述当前正在仲裁的主题或术语。此字段主要用于日志记录和调试，帮助追溯决策过程。例如：`"术语 'FR' 的定义"`。
*   `units` (array, 必需): 一个 `ConflictingInformationUnit` 对象的数组，包含所有需要进行仲裁的信息。

##### **3.3. `ArbitrationResponse` (仲裁响应)**
这是仲裁接口返回的数据结构。

```json
{
  "winning_unit": {
    "type": "object",
    "value": { "$ref": "#/definitions/ConflictingInformationUnit" }
  }
}
```

*   `winning_unit` (object, **可为 null**): 经过仲裁后被选中的唯一 `ConflictingInformationUnit`。
    *   如果根据规则有明确的胜出者，此字段将包含该信息单元的完整对象。
    *   如果输入的 `units` 数组为空，或不包含任何来自有效来源组件的信息，此字段将为 `null`。

#### **4. 接口定义**

##### **`arbitrate(request: ArbitrationRequest) -> ArbitrationResponse`**

*   **描述:** 根据《L1-DP4 知识冲突仲裁逻辑规则定义》中定义的优先级规则，对一组冲突信息单元进行仲裁。
*   **输入 (Input):**
    *   `request` (`ArbitrationRequest`): 一个包含待仲裁信息单元的请求对象。
*   **输出 (Output):**
    *   一个 `ArbitrationResponse` 对象。该对象中的 `winning_unit` 字段将包含获胜的信息单元，或在没有有效信息时为 `null`。
*   **错误处理 (Error Handling):**
    *   **无效输入:** 如果 `request` 对象本身为 `null` 或其必需字段（如 `topic`, `units`）缺失，实现时应抛出一个明确的参数错误异常（例如，`IllegalArgumentException` 或等效的语言特性）。这属于调用方的契约违规。
    *   **执行逻辑:** 函数的执行逻辑**必须**严格遵循《L1-DP4 知识冲突仲裁逻辑规则定义 (V1.0)》中的伪代码。

#### **5. 示例调用流程**

##### **场景 A: 存在冲突，L1-DP2 胜出**

**背景:** 一个上游组件（如 `L1-DP5` 的上下文聚合器）需要获取术语 "FR" 的定义，并同时从词汇服务和知识库服务获取了信息。

1.  **调用方构建 `ArbitrationRequest`:**

    ```json
    {
      "topic": "Definition of term 'FR'",
      "units": [
        {
          "source_component": "L1-DP3",
          "content": "FR can stand for 'France' or 'Financial Review'.",
          "metadata": { "retrieval_score": 0.75 }
        },
        {
          "source_component": "L1-DP2",
          "content": "Functional Requirement",
          "metadata": { "source": "project_lexicon.json" }
        }
      ]
    }
    ```

2.  **调用 `arbitrate` 函数**。

3.  **函数返回 `ArbitrationResponse`:**
    仲裁器内部逻辑应用“L1-DP2 优先于 L1-DP3”的规则。

    ```json
    {
      "winning_unit": {
        "source_component": "L1-DP2",
        "content": "Functional Requirement",
        "metadata": { "source": "project_lexicon.json" }
      }
    }
    ```

4.  **调用方接收响应**，并使用 `winning_unit` 中的内容继续其工作流程。

##### **场景 B: 无冲突，只有 L1-DP3 的信息**

**背景:** 调用方需要了解 "微服务架构" 的信息，该术语未在项目词汇中定义。

1.  **调用方构建 `ArbitrationRequest`:**

    ```json
    {
      "topic": "Information about 'Microservice Architecture'",
      "units": [
        {
          "source_component": "L1-DP3",
          "content": "Microservices is an architectural style...",
          "metadata": { "retrieval_score": 0.91 }
        }
      ]
    }
    ```

2.  **调用 `arbitrate` 函数**。

3.  **函数返回 `ArbitrationResponse`:**
    由于没有来自 `L1-DP2` 的信息，`L1-DP3` 的信息单元成为唯一候选并胜出。

    ```json
    {
      "winning_unit": {
        "source_component": "L1-DP3",
        "content": "Microservices is an architectural style...",
        "metadata": { "retrieval_score": 0.91 }
      }
    }
    ```

##### **场景 C: 无有效输入**

1.  **调用方构建空的 `ArbitrationRequest`:**

    ```json
    {
      "topic": "An empty request",
      "units": []
    }
    ```

2.  **调用 `arbitrate` 函数**。

3.  **函数返回 `ArbitrationResponse`:**
    由于没有可供选择的信息单元，`winning_unit` 为 `null`。

    ```json
    {
      "winning_unit": null
    }
    ```

---
Gemini 2.5 Pro 0605 writer