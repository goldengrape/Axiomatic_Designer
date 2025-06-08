好的，遵照指示。

我将基于《公理设计辅助系统 L1 公理设计文档 (V1.1)》中对 `L1-DP8` 的职责定义，以及《软件用户需求文档 (URD) V1.6》中所有与用户交互相关的需求，设计一份全新的、职责清晰的 API 接口规范。

这份规范的设计将严格遵循系统内其他 API 规范（如 `L1-DP6`, `L1-DP7`）所建立的模式，特别是采用异步任务模型来处理需要用户等待和决策的交互，以确保架构的一致性和健壮性。

以下是为 `L1-DP8 用户命令与控制` 撰写的 API 接口规范文档。

---

### **L1-DP8 用户命令与控制 API 接口规范 (V1.0)**

**状态:** 草稿 (Draft)

**版本说明:** 本文档是 `L1-DP8` API 接口规范的初始版本 (V1.0)。其设计旨在满足《公理设计辅助系统 L1 公理设计文档 (V1.1)》中定义的 `FR8: 处理用户交互与决策` 的功能需求，并为《软件用户需求文档 (URD) V1.6》中描述的各类用户交互场景（如流程控制、用户仲裁、变更决策、即时批注）提供一个明确、健壮且一致的编程接口。

#### **1. 引言**

本文档详细定义了 `L1-DP8: 用户命令与控制` 的应用程序编程接口（API）。根据 L1 设计，`L1-DP8` 是连接自动化系统（以 `L1-DP0` 为核心）与人类用户的唯一桥梁。其核心职责是捕获所有用户输入（命令、决策、批注），将其解析为系统内部的标准化事件和数据，并管理需要用户参与的异步任务。

**设计哲学:**
*   **命令与查询分离 (CQS):** API 明确区分改变系统状态的**命令** (Commands) 和需要用户决策的**任务** (Tasks)。
*   **异步任务模型:** 对于所有需要用户思考和决策的交互（如仲裁、变更影响确认），API 采用异步任务模型。系统控制器 (`L1-DP0`) 创建一个“用户任务”，并轮询其状态，从而将系统流程与不确定的用户响应时间解耦。
*   **事件驱动:** `L1-DP8` 接收用户的操作，并将其作为事件通知给 `L1-DP0`，以驱动工作流状态机的转换。

**设计依据:**
*   《公理设计辅助系统 L1 公理设计文档 (V1.1)》 (FR8, DP8)
*   《软件用户需求文档 (URD) V1.6》 (特别是 §3.1, §3.2, §4.3, §7.3)
*   《L1-DP0 工作流状态机定义文档 (V1.1)》

#### **2. API 通用约定**

*   **主机地址 (Base URL):** 本规范不定义具体的主机地址。在实际部署中，应通过服务发现机制或配置文件来提供。所有路径均基于此 Base URL。
*   **API 版本:** API 版本通过 URL 路径进行标识。本规范定义的版本为 `v1`。
    *   示例: `https://<hostname>/api/v1/...`
*   **数据格式:** 所有请求体和响应体均使用 `application/json` 格式，并采用 `UTF-8` 编码。
*   **认证与授权:** 本 API 代表着用户的直接意图，因此**必须**强制执行严格的认证和授权。
    *   **认证方式 (Authentication):** 请求方必须在 HTTP Header 中提供一个代表最终用户的承载秘密信息的 `Authorization` 字段。
        *   **值格式示例:** `Bearer <end_user_jwt_token>`
    *   **身份标识 (Identification):** 请求方必须在 HTTP Header 中提供 `X-System-Component-ID` 字段，其值为调用方组件的标识符（例如 `Web-UI`, `CLI-Tool`）。
*   **错误处理:** API 使用标准的 HTTP 状态码。错误响应体应包含一个标准化的错误对象。

#### **3. 核心概念**

*   **用户任务 (User Task):** 当系统工作流需要用户输入才能继续时（例如，批准文档、进行仲裁），`L1-DP0` 会通过 `L1-DP8` 创建一个“用户任务”。这是一个长生命周期的资源，代表一个待办事项。UI 层应监视这些任务并呈现给用户。
*   **决策 (Decision):** 用户在完成一个“用户任务”时提交的具体选择。它是一个结构化的数据对象，能够被 `L1-DP0` 确定性地解析和处理。

#### **4. 数据模型 (Data Models)**

##### **4.1. UserTask (用户任务)**
代表一个需要用户处理的异步任务。是 `GET /user-tasks/{task_id}` 的核心响应体。

```json
{
  "task_id": "string",
  "task_type": "string",
  "status": "string",
  "prompt": {
    "title": "string",
    "description": "string"
  },
  "context": "object",
  "decision_options": "array",
  "user_decision": {
    "type": "object",
    "optional": true
  },
  "created_at": "string (ISO 8601)",
  "expires_at": "string (ISO 8601)"
}
```
*   `task_type` (enum): `ARBITRATION`, `CHANGE_IMPACT_CONFIRMATION`, `FINAL_APPROVAL`。
*   `status` (enum): `PENDING_USER_ACTION`, `COMPLETED`, `EXPIRED`。
*   `context` (object): 根据 `task_type` 变化，包含决策所需的所有信息。例如，对于 `ARBITRATION`，它会包含文档URI、评审意见摘要等。
*   `decision_options` (array): 向用户展示的可选操作列表。
*   `user_decision` (object, 可选): 用户完成后，此字段将包含其决策。

##### **4.2. Decision (决策)**
`PUT /user-tasks/{task_id}/decision` 的请求体。

```json
{
  "decision_code": "string",
  "payload": {
    "type": "object",
    "optional": true
  }
}
```
*   `decision_code` (string, enum): 用户选择的机器可读的决策代码。例如 `APPROVE_CURRENT`, `RESET_CYCLE`, `CONFIRM_INVALIDATION`。
*   `payload` (object, 可选): 包含与决策相关的额外数据。例如，当 `decision_code` 是 `RESET_CYCLE` 时，`payload` 包含用户输入的新指令。

##### **4.3. Annotation (批注)**
`POST /annotations` 的请求体，用于实现即时反馈 (URD §7.3)。

```json
{
  "document_uri": "string",
  "target_context_snippet": "string",
  "comment": "string",
  "author_id": "string"
}
```
*   `target_context_snippet` (string, 必需): 作为“锚点”的上下文片段，用于鲁棒的定位。

##### **4.4. CommandRequest (命令请求)**
用于发送简单的、同步的流程控制命令。

```json
{
  "command": "string",
  "target_resource_uri": "string"
}
```
*   `command` (string, enum): `START_PROCESS`, `PAUSE_PROCESS`, `RESUME_PROCESS`, `TERMINATE_PROCESS`。

#### **5. 端点定义**

##### **5.1. 流程控制端点 (Process Control Endpoint)**

###### **POST /api/v1/commands**
*   **描述:** 发送一个全局的、同步的流程控制命令，如启动、暂停、恢复或终止一个流程。`L1-DP0` 将监听这些命令并采取行动。
*   **请求体:** `CommandRequest` 对象。
*   **成功响应:** `202 Accepted`。表示命令已被接受，正在处理。
*   **错误响应:** `400 Bad Request`, `404 Not Found` (如 `target_resource_uri` 无效)。

##### **5.2. 异步用户任务管理端点 (User Task Management Endpoints)**

###### **POST /api/v1/user-tasks**
*   **描述:** 由系统内部组件 (`L1-DP0`) 调用，用于创建一个需要用户决策的新任务。
*   **请求体:** 包含 `task_type`, `prompt`, `context`, `decision_options` 等字段的 `UserTask` 初始化对象。
*   **成功响应:**
    *   **状态码:** `201 Created`
    *   **Headers:** `Location: /api/v1/user-tasks/{task_id}`
    *   **响应体:** 创建的完整 `UserTask` 对象，状态为 `PENDING_USER_ACTION`。
*   **错误响应:** `400 Bad Request`。

###### **GET /api/v1/user-tasks**
*   **描述:** 获取当前用户的待办任务列表。UI 层应调用此接口来显示用户的任务清单。
*   **查询参数:** `?status=PENDING_USER_ACTION` (可选, 用于过滤)
*   **成功响应:** `200 OK`，响应体为一个 `UserTask` 对象数组。

###### **GET /api/v1/user-tasks/{task_id}**
*   **描述:** 获取单个用户任务的详细信息。`L1-DP0` 或 UI 层会轮询此端点以监控任务状态。
*   **成功响应:** `200 OK`，响应体为完整的 `UserTask` 对象。
*   **错误响应:** `404 Not Found`。

###### **PUT /api/v1/user-tasks/{task_id}/decision**
*   **描述:** 用户通过 UI 提交对某个任务的决策。这是用户交互的核心写入操作。
*   **请求体:** `Decision` 对象。
*   **成功响应:** `200 OK`，响应体为更新后的 `UserTask` 对象，其状态为 `COMPLETED`。
*   **错误响应:** `400 Bad Request`, `404 Not Found`, `409 Conflict` (如任务已被处理或过期)。

##### **5.3. 即时反馈端点 (Instant Feedback Endpoint)**

###### **POST /api/v1/annotations**
*   **描述:** 用户在查看文档时提交一个即时批注。这是一个独立的、同步的操作，其结果会作为输入提供给下一轮的“撰写员”(L1-DP5)。
*   **请求体:** `Annotation` 对象。
*   **成功响应:** `201 Created`。
*   **错误响应:** `400 Bad Request`, `404 Not Found` (文档URI无法解析)。

#### **6. 示例：用户仲裁流程 (URD §4.3)**

**场景:** `L1-DP6` 评审文档达到最大循环次数，`L1-DP0` 决定暂停流程，请求用户仲裁。

##### **步骤 1: `L1-DP0` 创建用户仲裁任务**
`L1-DP0` 调用 DP8 的 API，为用户创建一个待办任务。
```bash
# L1-DP0 -> L1-DP8
curl -X POST \
  -H "Authorization: Bearer <system_component_token>" \
  -H "X-System-Component-ID: L1-DP0" \
  -H "Content-Type: application/json" \
  -d '{
    "task_type": "ARBITRATION",
    "prompt": {
      "title": "仲裁请求：文档修订陷入僵局",
      "description": "文档 \'AD_L2.md\' 的自动化评审已达到最大次数，但仍有未解决的关键问题。请您决策如何继续。"
    },
    "context": {
      "document_uri": "vcs://project-alpha/docs/AD_L2.md?commit=a1b2c3d4",
      "unresolved_findings_summary": ["CRITICAL: 独立公理违规", "MAJOR: 未能追溯到UR-5.2"]
    },
    "decision_options": [
      {"code": "APPROVE_CURRENT", "label": "强制批准当前版本"},
      {"code": "RESET_CYCLE", "label": "提供新指令并重试", "needs_payload": true},
      {"code": "ABANDON_DOCUMENT", "label": "放弃此文档"}
    ]
  }' \
  'https://<hostname>/api/v1/user-tasks'

# L1-DP8 返回 201 Created 和任务URL
# Location: /api/v1/user-tasks/task-arb-12345
```

##### **步骤 2: UI 层获取并展示任务**
用户的 Web UI 定期调用 `GET /api/v1/user-tasks?status=PENDING_USER_ACTION`，发现了新任务 `task-arb-12345`。它获取任务详情并向用户渲染一个决策界面。

##### **步骤 3: 用户提交决策**
用户选择“提供新指令并重试”，并在文本框中输入了新的指令。UI 将此决策提交。```bash
# Web-UI -> L1-DP8 (代表最终用户)
curl -X PUT \
  -H "Authorization: Bearer <end_user_jwt_token>" \
  -H "X-System-Component-ID: Web-UI" \
  -H "Content-Type: application/json" \
  -d '{
    "decision_code": "RESET_CYCLE",
    "payload": {
      "new_instructions": "重点解决独立公理问题。可以考虑引入一个新的L2-DP来解耦FR2和FR3的功能。"
    }
  }' \
  'https://<hostname>/api/v1/user-tasks/task-arb-12345/decision'

# L1-DP8 返回 200 OK 和更新后的任务
# { "task_id": "task-arb-12345", "status": "COMPLETED", ... }
```

##### **步骤 4: `L1-DP0` 检测到决策并继续工作流**
`L1-DP0` 在其轮询周期中调用 `GET /api/v1/user-tasks/task-arb-12345`，发现 `status` 已变为 `COMPLETED`。它读取 `user_decision` 字段，解析出 `decision_code` 和 `payload`，然后在其状态机中触发向 `DOCUMENT_WRITING` 状态的转换，并将新的指令传递给 `L1-DP5`。

---
Gemini 2.5 Pro 0605 writer