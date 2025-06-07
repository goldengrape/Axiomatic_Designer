好的，遵照指示。

我已分析了《项目代办事项列表 (V2.2)》，下一项任务是 **撰写《L1-DP7 版本控制服务 API 接口规范》**。

根据 L1 公理设计文档 (`ADD_L1`) 和用户需求文档 (`URD`)，`L1-DP7` 的核心职责是提供一个与具体 Git 实现解耦的抽象接口，用于管理文档的版本、状态和变更。这份 API 规范将是实现该职责的关键。它必须为系统的其他组件（如 `L1-DP0`, `L1-DP5`, `L1-DP6`）提供稳定、可靠的服务，以执行文件读写、版本提交、状态变更以及处理复杂的变更管理流程。

以下是本次工作的产出文档。

---

### **L1-DP7 版本控制与变更服务 API 接口规范 (V1.0)**

**状态:** 草稿 (Draft)

**版本说明:** 本文档 (V1.0) 是该 API 规范的初版。其目的是为 `L1-DP7: 版本控制与变更服务` 定义一个清晰、标准化的交互接口。该接口将底层的版本控制系统（默认为 Git）操作抽象为面向文档生命周期的服务。

#### **1. 引言**

本文档详细定义了 `L1-DP7: 版本控制与变更服务` 的应用程序编程接口（API）。根据《公理设计辅助系统 L1 公理设计文档 (V1.1)》，`L1-DP7` 的核心职责是提供与外部 Git 仓库交互的标准接口，并实现文档状态管理和变更管理的核心逻辑。

本 API 的设计哲学是 **抽象化** 和 **面向资源**。它将 Git 的底层概念（如 commit, tree, blob, ref, tag）抽象为系统更高层级的业务概念，如 **文档 (Document)**、**版本 (Version)**、**状态 (State)** 和 **变更提议 (Change Proposal)**。这使得调用方（如 `L1-DP0`, `L1-DP5`）可以不关心底层的 Git 实现细节。

**设计依据:**
*   《公理设计辅助系统 L1 公理设计文档 (V1.1)》
*   《软件用户需求文档 (URD) V1.6》 (特别是 §2.1, §3.2, §7.1)
*   《项目代办事项列表 (V2.2)》

#### **2. API 通用约定**

*   **主机地址 (Base URL):** 本规范不定义具体的主机地址。在实际部署中，应通过服务发现机制或配置文件来提供。所有路径均基于此 Base URL。
*   **API 版本:** API 版本通过 URL 路径进行标识。本规范定义的版本为 `v1`。
    *   示例: `https://<hostname>/api/v1/...`
*   **数据格式:** 所有请求体（`Request Body`）和响应体（`Response Body`）均使用 `application/json` 格式，并采用 `UTF-8` 编码。
*   **认证与授权:** 本 API 要求所有请求**必须**同时包含**身份标识**和**认证凭据**。
    *   **认证方式 (Authentication):** 请求方必须在 HTTP Header 中提供一个承载秘密信息的 `Authorization` 字段。
        *   **值格式示例:** `Bearer <system_component_token>`
    *   **身份标识 (Identification):** 请求方必须在 HTTP Header 中提供 `X-System-Component-ID` 字段，其值为调用方组件的标识符（例如 `L1-DP0`）。
*   **路径编码:** 文档路径 `document_path` 在 URL 中必须进行标准的百分号编码（Percent-encoding）。
*   **错误处理:** API 使用标准的 HTTP 状态码。错误响应体应包含一个标准化的错误对象。

#### **3. 核心资源与数据模型**

##### **3.1. DocumentContent (文档内容)**
代表一个特定版本的文档内容。

```json
{
  "document_path": "string",
  "content": "string",
  "version_id": "string",
  "last_modified": "string (ISO 8601)"
}
```

##### **3.2. VersionSummary (版本摘要)**
代表版本历史中的一个节点。

```json
{
  "version_id": "string",
  "message": "string",
  "author": "string",
  "timestamp": "string (ISO 8601)"
}
```

##### **3.3. DocumentState (文档状态)**
代表一个文档的生命周期状态。

```json
{
  "document_path": "string",
  "state": "string",
  "version_id": "string"
}
```
*   `state` (string, enum): 枚举值：`DRAFT` (草稿), `FROZEN` (已冻结), `ARCHIVED` (已归档)。

##### **3.4. CommitRequest (提交请求)**
用于向版本库提交一次或多次文件变更的原子操作。

```json
{
  "commit_message": "string",
  "author_component_id": "string",
  "file_changes": [
    {
      "path": "string",
      "new_content": "string"
    }
  ],
  "change_impact_report_uri": "string (optional)"
}
```
*   `commit_message` (string, 必需): 提交信息的主体，服务会根据 URD §7.1 在其基础上添加标准前缀。
*   `author_component_id` (string, 必需): 触发本次提交的组件标识。
*   `file_changes` (array, 必需): 一个包含所有文件变更的数组。
*   `change_impact_report_uri` (string, 可选): 如果本次提交与一次变更管理流程相关，则必须引用《变更影响报告》的 URI。

#### **4. 文档与版本端点 (Document & Version Endpoints)**

##### **GET /api/v1/documents/{document_path}**
*   **描述:** 获取指定文档的最新版本内容。默认从主工作流分支 (e.g., `main`) 获取。
*   **成功响应:** `200 OK`，响应体为 `DocumentContent` 对象。
*   **错误响应:** `404 Not Found`。

##### **GET /api/v1/documents/{document_path}?version={version_id}**
*   **描述:** 获取指定文档的特定版本内容。
*   **成功响应:** `200 OK`，响应体为 `DocumentContent` 对象。
*   **错误响应:** `404 Not Found` (文档或版本不存在)。

##### **GET /api/v1/documents/{document_path}/versions**
*   **描述:** 获取指定文档的版本历史。
*   **成功响应:** `200 OK`，响应体为 `VersionSummary` 对象数组。
*   **错误响应:** `404 Not Found`。

##### **POST /api/v1/commits**
*   **描述:** 提交一次原子性的文件变更。这是系统主要的写入操作，由自动化系统代理 (`Operator`) 调用。
*   **请求体:** `CommitRequest` 对象。
*   **成功响应:**
    *   **状态码:** `201 Created`
    *   **响应体:** 一个包含新 `version_id` 的对象：`{ "new_version_id": "string" }`。
*   **错误响应:** `400 Bad Request`, `409 Conflict` (如发生编辑冲突)。

#### **5. 文档状态管理端点 (State Management Endpoints)**

##### **GET /api/v1/documents/{document_path}/state**
*   **描述:** 获取文档的当前生命周期状态。服务通过检查是否存在特定的状态标签（如 `frozen-v1.1`）来确定。
*   **成功响应:** `200 OK`，响应体为 `DocumentState` 对象。
*   **错误响应:** `404 Not Found`。

##### **PUT /api/v1/documents/{document_path}/state**
*   **描述:** 更新文档的生命周期状态。主要用于“冻结”文档。
*   **请求体:**
    ```json
    {
      "state": "FROZEN",
      "version_id": "string",
      "tag_name": "string"
    }
    ```
*   **成功响应:** `200 OK`，响应体为更新后的 `DocumentState` 对象。
*   **错误响应:** `400 Bad Request`, `404 Not Found`, `409 Conflict` (如该版本已被冻结)。

#### **6. 变更管理端点 (Change Management Endpoints)**

此组端点严格遵循 URD §3.2 中定义的变更管理流程。

##### **POST /api/v1/change-proposals**
*   **描述:** 为一个已冻结的文档发起一个变更提议。服务将在后端为此创建一个隔离的变更分支。
*   **请求体:** `{ "source_document_uri": "string" }`
*   **成功响应:** `202 Accepted`，响应体包含新提议的ID和可操作的URL：
    ```json
    {
      "proposal_id": "string",
      "status": "PROPOSED",
      "expires_at": "string (ISO 8601)",
      "actions": {
        "update_content": "/api/v1/change-proposals/{id}/document",
        "analyze": "/api/v1/change-proposals/{id}/analyze"
      }
    }
    ```

##### **PUT /api/v1/change-proposals/{proposal_id}/document**
*   **描述:** 在变更提议的隔离分支中，更新文档内容。
*   **请求体:** `{ "content": "string" }`
*   **成功响应:** `200 OK`。

##### **POST /api/v1/change-proposals/{proposal_id}/analyze**
*   **描述:** 触发对变更的依赖分析。这是一个异步操作。
*   **成功响应:** `202 Accepted`。

##### **GET /api/v1/change-proposals/{proposal_id}/analysis-report**
*   **描述:** 获取依赖分析的结果。客户端应轮询此端点。
*   **成功响应:**
    *   当分析正在进行时: `200 OK`, `{ "status": "ANALYZING" }`。
    *   当分析完成时: `200 OK`，响应体为结构化的依赖报告，包含置信度评分 (URD §3.2.3.1)。
*   **错误响应:** `404 Not Found`。

##### **POST /api/v1/change-proposals/{proposal_id}/confirm**
*   **描述:** 用户确认分析报告，并最终决定需要作废的下游文档清单。服务在此步骤生成并存储《变更影响报告》。
*   **请求体:** `{ "invalidated_documents": ["uri1", "uri2"] }`
*   **成功响应:** `200 OK`，响应体包含已生成的《变更影响报告》的URI。
*   **错误响应:** `409 Conflict` (如果分析尚未完成)。

##### **POST /api/v1/change-proposals/{proposal_id}/execute**
*   **描述:** 执行最终的变更。服务将合并变更分支，并使用《变更影响报告》的URI作为提交信息的一部分来创建一个新的提交。
*   **成功响应:** `200 OK`，响应体包含新的 `version_id`。
*   **错误响应:** `409 Conflict` (如果确认步骤未完成)。

---
Gemini 2.5 Pro 0605 writer