好的，遵照指示。

根据《项目代办事项列表 (V1.4)》的规划，下一个待办事项是：“撰写《L1-DP2 词汇服务 API 接口规范》”。

我将依据已批准的《公理设计辅助系统 L1 公理设计文档 (V1.1)》、《软件用户需求文档 (V1.6)》以及《项目词汇与约束文件 Schema 规范 (V1.2)》，并参考现有 `L1-DP1` 的 API 规范，来设计和撰写这份新的接口规范文档。

设计的核心是为 `L1-DP2: 项目词汇服务` 定义一套清晰、高效、安全的 API。这套 API 将服务于两个主要目的：1) 允许管理工具对项目的词汇与约束文件进行完整的 CRUD 操作；2) 为其他系统组件（如 `L1-DP4`, `L1-DP5`, `L1-DP6`）提供高效的、细粒度的查询能力，以确保它们在工作中能够确定性地应用项目级的术语和规则。

以下是完整的《L1-DP2 词汇服务 API 接口规范》文档。

---

### **L1-DP2 词汇服务 API 接口规范 (V1.0)**

**状态:** 草稿 (Draft)

**版本说明:** 本文档 (V1.0) 是 `L1-DP2: 项目词汇服务` 的首个 API 接口规范。它旨在定义一套完整的、解耦的、符合公理设计原则的接口，用于管理和查询项目的“知识范式 (Canon)”，即项目词汇与约束文件。

#### **1. 引言**

本文档详细定义了 `L1-DP2: 项目词汇服务` 对外提供服务的应用程序编程接口（API）。此 API 的核心职责是为系统提供一个管理和查询“项目词汇与约束”文件的标准化接口。根据 L1 设计，该服务是确保全项目术语、命名和格式一致性的唯一权威来源。

本规范将 API 分为两类：
1.  **管理接口:** 提供对整个词汇文件进行创建、替换和删除（CRUD）的能力，主要供管理工具或授权用户界面使用。
2.  **查询接口:** 提供高效、细粒度的查询能力，供其他系统组件（如 `L1-DP4`, `L1-DP5`, `L1-DP6`）在执行任务时按需获取特定规则或定义。该类接口包含一个批量查询端点，以避免 N+1 查询问题。

**设计依据:**
*   《公理设计辅助系统 L1 公理设计文档 (V1.1)》
*   《项目词汇与约束文件 Schema 规范 (V1.2)》
*   《软件用户需求文档 (V1.6)》

#### **2. API 通用约定**

*   **主机地址 (Base URL):** 本规范不定义具体的主机地址。在实际部署中，应通过服务发现机制或配置文件来提供。所有路径均基于此 Base URL。
*   **API 版本:** API 版本通过 URL 路径进行标识。本规范定义的版本为 `v1`。
    *   示例: `https://<hostname>/api/v1/...`
*   **资源模型:** 本服务将项目词汇视为一个**单例资源 (Singleton Resource)**，因为每个项目通常只有一个统一的词汇与约束文件。因此，所有端点都将作用于 `/lexicon` 这一固定路径。
*   **数据格式:** 所有请求体（`Request Body`）和响应体（`Response Body`）均使用 `application/json` 格式，并采用 `UTF-8` 编码。
*   **认证与授权:** 本 API 要求所有请求**必须**同时包含**身份标识**和**认证凭据**。
    *   **认证方式 (Authentication):** 请求方必须在 HTTP Header 中提供一个承载秘密信息的 `Authorization` 字段。
    *   **身份标识 (Identification):** 请求方必须在 HTTP Header 中提供 `X-System-Component-ID` 字段，其值为调用方组件的标识符（例如 `L1-DP6`）。
    *   **授权逻辑 (Authorization):** 服务实现层应包含一个可配置的访问控制列表（ACL）。查询操作（`GET`, `POST /query`）通常允许更广泛的组件访问，而写入操作（`PUT`, `DELETE`）的权限应被严格限制。
*   **错误处理:** API 使用标准的 HTTP 状态码。错误响应体应包含一个标准化的错误对象。

#### **3. 数据模型 (Data Models)**

##### **3.1. Lexicon (词汇与约束)**

完整的词汇数据结构由《项目词汇与约束文件 Schema 规范 (V1.2)》定义。管理接口接收和返回的词汇对象 **必须** 严格遵循该 Schema。

##### **3.2. Error (错误响应)**

```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": "string (optional)"
  }
}
```
*   `code` (string): 机器可读的错误代码（例如：`LEXICON_NOT_FOUND`, `SCHEMA_VALIDATION_FAILED`）。
*   `message` (string): 人类可读的错误信息。
*   `details` (string, 可选): 详细技术信息。

##### **3.3. BatchQueryResponse (批量查询响应)**

用于 `POST /lexicon/query` 端点的响应。它返回一个包含所有找到的条目的结构化对象。

```json
{
  "glossary": {
    "Design Matrix": {
      "definition": "A matrix that maps Functional Requirements (FRs) to Design Parameters (DPs) to visualize and analyze the relationships between them.",
      "aliases": ["FR-DP Matrix"]
    }
  },
  "acronyms": {
    "URD": { "expansion": "User Requirements Document" }
  },
  "namingConventions": [
    {
      "target": {
        "id": "ARTIFACT_TYPE_IF_SPEC_DOC",
        "description": "Interface Specification Document"
      },
      "pattern": "^IF_([A-Z0-9]+_)*[A-Z0-9]+\\.md$",
      "description": "Interface specification documents must start with 'IF_' and end with '.md'. Example: 'IF_L1_DP2_API_Spec.md'"
    }
  ],
  "formattingConstraints": [],
  "notFound": {
    "glossary": ["NonExistentTerm"],
    "acronyms": ["XYZ"],
    "namingConventionIds": ["ID_NOT_EXIST"],
    "formattingConstraintIds": []
  }
}
```

#### **4. 管理接口定义 (Management Endpoints)**

##### **GET /api/v1/lexicon**
*   **描述:** 检索完整的项目词汇与约束文件。
*   **成功响应:**
    *   **状态码:** `200 OK`
    *   **响应体:** 符合《项目词汇与约束文件 Schema 规范 (V1.2)》的完整 JSON 对象。
*   **错误响应:** `401 Unauthorized`, `403 Forbidden`, `404 Not Found`。

##### **PUT /api/v1/lexicon**
*   **描述:** 创建或完整替换项目词汇与约束文件。这是一个幂等操作。服务器在接受前**必须**对请求体执行完整的 Schema 验证。
*   **请求体:** 一个符合《项目词汇与约束文件 Schema 规范 (V1.2)》的完整 JSON 对象。
*   **成功响应:**
    *   **状态码:** `200 OK` (替换现有文件) 或 `201 Created` (创建新文件)。
    *   **响应体:** 与 `GET /api/v1/lexicon` 相同的完整词汇对象。
*   **错误响应:**
    *   `400 Bad Request`: 请求体为空、非法的 JSON 格式或未能通过 Schema 验证。
    *   `401 Unauthorized`, `403 Forbidden`, `500 Internal Server Error`。

##### **DELETE /api/v1/lexicon**
*   **描述:** 删除项目词汇与约束文件。
*   **成功响应:**
    *   **状态码:** `204 No Content`
*   **错误响应:** `401 Unauthorized`, `403 Forbidden`, `404 Not Found`。

#### **5. 查询接口定义 (Query Endpoints)**

##### **5.1. 细粒度查询 (Granular Queries)**

###### **GET /api/v1/lexicon/glossary/{term}**
*   **描述:** 根据术语名称获取其定义。
*   **路径参数:** `term` (string, 必需): 需要查询的术语，需进行 URL 编码。
*   **成功响应:**
    *   **状态码:** `200 OK`
    *   **响应体:** 包含 `definition` 和 `aliases` 的 JSON 对象。
*   **错误响应:** `404 Not Found`

###### **GET /api/v1/lexicon/acronyms/{acronym}**
*   **描述:** 根据缩写词获取其全称。
*   **路径参数:** `acronym` (string, 必需)。
*   **成功响应:**
    *   **状态码:** `200 OK`
    *   **响应体:** 包含 `expansion` 的 JSON 对象。
*   **错误响应:** `404 Not Found`

###### **GET /api/v1/lexicon/naming-conventions/{id}**
*   **描述:** 根据唯一 ID 获取命名约定规则。
*   **路径参数:** `id` (string, 必需): 规则的唯一标识符，如 `ARTIFACT_TYPE_IF_SPEC_DOC`。
*   **成功响应:**
    *   **状态码:** `200 OK`
    *   **响应体:** 完整的命名约定规则对象。
*   **错误响应:** `404 Not Found`

###### **GET /api/v1/lexicon/formatting-constraints/{id}**
*   **描述:** 根据唯一 ID 获取格式化约束规则。
*   **路径参数:** `id` (string, 必需): 规则的唯一标识符，如 `DATA_TYPE_ISO_DATE`。
*   **成功响应:**
    *   **状态码:** `200 OK`
    *   **响应体:** 完整的格式化约束规则对象。
*   **错误响应:** `404 Not Found`

##### **5.2. 批量查询 (Batch Query)**

###### **POST /api/v1/lexicon/query**
*   **描述:** 在一次请求中批量查询多个词汇、缩写和规则。这旨在优化性能，避免客户端发起大量并发请求。
*   **请求体:**
    ```json
    {
      "glossary": ["Design Matrix", "NonExistentTerm"],
      "acronyms": ["URD", "XYZ"],
      "namingConventionIds": ["ARTIFACT_TYPE_IF_SPEC_DOC", "ID_NOT_EXIST"],
      "formattingConstraintIds": ["DATA_TYPE_SEMVER"]
    }
    ```
*   **成功响应:**
    *   **状态码:** `200 OK`
    *   **响应体:** `BatchQueryResponse` 对象。其中 `notFound` 字段列出了所有未在词汇库中找到的请求项。
*   **错误响应:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`。

#### **6. 示例：调用流程与cURL**

**场景1: `L1-DP6` (评审引擎) 批量校验文档中的术语和规则**
```bash
# L1-DP6 在审查文档前，一次性获取所有需要的定义和规则
curl -X POST \
  -H "Authorization: Bearer <component_token>" \
  -H "X-System-Component-ID: L1-DP6" \
  -H "Content-Type: application/json" \
  -d '{
    "glossary": ["Design Matrix", "Frozen Document"],
    "acronyms": ["URD", "DP"],
    "namingConventionIds": ["ARTIFACT_TYPE_AD_L2_DOC"],
    "formattingConstraintIds": ["DATA_TYPE_ISO_DATE"]
  }' \
  'https://<hostname>/api/v1/lexicon/query'

# 成功时返回 200 OK 和 BatchQueryResponse JSON 对象
```

**场景2: 管理员上传并替换整个词汇文件**
```bash
# 管理员通过UI代理组件，上传一个新的词汇文件内容
# 注意：请求体必须是完整的、符合 V1.2 Schema 的 JSON
curl -X PUT \
  -H "Authorization: Bearer <admin_user_token>" \
  -H "X-System-Component-ID: Admin-UI-Proxy" \
  -H "Content-Type: application/json" \
  -d @/path/to/new_lexicon.lexicon.json \
  'https://<hostname>/api/v1/lexicon'

# 成功时返回 200 OK 或 201 Created，响应体为完整的词汇文件内容
```

---
Gemini 2.5 Pro 0605 writer