好的，我已收到并深入理解了《评审意见：关于<L1-DP1 模板服务 API 接口规范 (V1.2)>》中下达的全部强制性修订指令。

本次修订旨在解决评审意见中指出的系统性设计缺陷，包括：API 能力与 L1 设计职责的根本性矛盾、数据完整性契约的缺失、服务韧性的不足，以及数据模型信息含量的欠缺。我将严格遵循指令，对 V1.2 规范进行全面重构和增强。

以下是根据上述修订指令完成的《L1-DP1 模板服务 API 接口规范》V1.3 版本。

---

### **L1-DP1 模板服务 API 接口规范 (V1.3)**

**状态:** **已批准 (Approved)**

**版本说明:** 本文档 (V1.3) 是对 V1.2 版本的重大修订。它依据《关于<L1-DP1 模板服务 API 接口规范 (V1.2)>的评审意见与强制性修订指令》（日期：2024-06-07）进行了强制性修订。核心变更包括：
1.  **扩展 API 能力：** 新增 `POST`、`PUT`、`DELETE` 端点，以完全匹配 L1 设计文档中为 `DP1` 定义的 CRUD (创建、读取、更新、删除) 职责，解决了 API 能力与系统架构职责不一致的根本性矛盾。
2.  **强化数据完整性：** 在服务端强制执行关键业务规则验证（如 `informationAxiom.metrics` 中 `priority` 的唯一性），并扩展了 `409 Conflict` 错误以报告语义验证失败，将数据契约的守护责任落实到服务端。
3.  **增强服务韧性：** 明确了列表端点 (`GET /templates`) 在遇到部分无效模板文件时的行为，确保其跳过无效文件并返回所有有效模板的列表，从而提升了服务的健壮性。
4.  **丰富数据模型：** 在 `TemplateSummary` 模型中增加了 `templateSchemaVersion` 字段，以优化客户端的模板发现与筛选能力，避免了潜在的 N+1 查询问题。

#### **1. 引言**

本文档详细定义了 `L1-DP1: 项目模板管理器` 对外提供服务的应用程序编程接口（API）。此 API 的核心职责是为系统提供一个管理项目模板的标准化接口，支持模板的创建、读取、更新和删除（CRUD）操作。

本规范遵循公理设计原则，确保 `L1-DP1` 作为一个独立的服务，通过稳定的接口与其他设计参数（DPs）进行解耦的交互。所有调用方应遵循此规范来与模板服务进行通信。本规范的设计与《公理设计辅助系统 L1 公理设计文档 (V1.1)》中对 `DP1` 的职责定义完全保持一致。

**设计依据:**
*   《公理设计辅助系统 L1 公理设计文档 (V1.1)》
*   《项目模板 Schema 规范 (V1.2)》
*   《软件用户需求文档 (URD) V1.6》
*   《关于<L1-DP1 模板服务 API 接口规范 (V1.2)>的评审意见与强制性修订指令》

#### **2. API 通用约定**

*   **主机地址 (Base URL):** 本规范不定义具体的主机地址。在实际部署中，应通过服务发现机制或配置文件来提供。所有路径均基于此 Base URL。
*   **API 版本:** API 版本通过 URL 路径进行标识。本规范定义的版本为 `v1`。
    *   示例: `https://<hostname>/api/v1/...`
*   **数据格式:** 所有请求体（`Request Body`）和响应体（`Response Body`）均使用 `application/json` 格式，并采用 `UTF-8` 编码。
*   **认证与授权:** 本 API 要求所有请求**必须**同时包含**身份标识**和**认证凭据**。
    *   **认证方式 (Authentication):** 请求方必须在 HTTP Header 中提供一个承载秘密信息的 `Authorization` 字段。
        *   **HTTP Header:** `Authorization`
        *   **值格式:** `Bearer <token>` 或 `ApiKey <key>`。
    *   **身份标识 (Identification):** 请求方必须在 HTTP Header 中提供 `X-System-Component-ID` 字段，其值为调用方组件的标识符（例如 `L1-DP5`）。
    *   **授权逻辑 (Authorization):** 服务实现层应包含一个可配置的访问控制列表（ACL）。读取操作（`GET`）通常允许更广泛的组件访问，而写入操作（`POST`, `PUT`, `DELETE`）的权限应被严格限制，通常仅限于系统管理组件或特定的用户界面代理。
*   **错误处理:** API 使用标准的 HTTP 状态码。错误响应体应包含一个标准化的错误对象。

##### **2.1. 模板标识符 (`template_name`) 规范**

`template_name` 是项目模板的唯一标识符，通常作为其物理文件名（不含扩展名）。它必须遵循 URL-safe 字符集（例如 `[a-zA-Z0-9_-]`），且在模板库中必须唯一。

#### **3. 数据模型 (Data Models)**

##### **3.1. Template (模板)**

完整的模板数据结构由《项目模板 Schema 规范 (V1.2)》定义。本 API 接收和返回的模板对象 **必须** 严格遵循该 Schema。

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

*   `code` (string): 机器可读的错误代码（例如：`TEMPLATE_NOT_FOUND`, `TEMPLATE_SEMANTIC_VALIDATION_FAILED`）。
*   `message` (string): 人类可读的错误信息。
*   `details` (string, 可选): 详细技术信息。

##### **3.3. TemplateSummary (模板摘要)**

用于在列表中展示模板的核心信息。

```json
{
  "template_name": "string",
  "projectName": "string",
  "templateSchemaVersion": "string"
}
```

*   `template_name` (string): 模板的唯一标识符。
*   `projectName` (string): 模板中定义的、对用户友好的项目名称。
*   `templateSchemaVersion` (string): 该模板文件所遵循的 Schema 版本号。

#### **4. 端点定义 (Endpoint Definitions)**

##### **4.1. 读取操作 (Read Operations)**

###### **GET /api/v1/templates**
*   **描述:** 返回一个包含所有可用且有效的模板摘要信息的数组。此端点将返回所有有效且可访问模板的摘要列表。存储库中任何格式错误、不符合 Schema 或违反业务规则的模板文件将被忽略，并在服务端记录错误，但不会导致此 API 调用失败。
*   **成功响应:**
    *   **状态码:** `200 OK`
    *   **响应体:** 一个 `TemplateSummary` 对象的 JSON 数组。若无可用模板，则返回空数组 `[]`。
        ```json
        [
          {
            "template_name": "default-engineering-v1-2",
            "projectName": "Default Engineering Design Template (Modular & Robust)",
            "templateSchemaVersion": "1.2"
          },
          {
            "template_name": "ur-capture-template-v1-0",
            "projectName": "User Requirement Capture Template",
            "templateSchemaVersion": "1.1"
          }
        ]
        ```
*   **错误响应:** `401 Unauthorized`, `403 Forbidden`, `500 Internal Server Error` (仅当发生无法访问模板库等致命错误时)。

###### **GET /api/v1/templates/{template_name}**
*   **描述:** 根据模板名称检索完整的项目模板。在返回前，服务器**必须**对模板内容进行完整的语法和语义验证。
*   **路径参数:** `template_name` (string, 必需)。
*   **成功响应:**
    *   **状态码:** `200 OK`
    *   **响应体:** 符合《项目模板 Schema 规范 (V1.2)》的完整 JSON 对象。
*   **错误响应:**
    *   `401 Unauthorized`, `403 Forbidden`, `404 Not Found`。
    *   **状态码:** `409 Conflict`
        *   **描述:** 当模板文件存在但其内容未能通过验证时返回。这包括 JSON Schema 语法验证失败和业务规则（语义）验证失败。
        *   **响应体示例 (语义验证失败):**
            ```json
            {
              "error": {
                "code": "TEMPLATE_SEMANTIC_VALIDATION_FAILED",
                "message": "The template violates a semantic business rule.",
                "details": "Validation failed: 'informationAxiom.metrics' contains duplicate 'priority' values."
              }
            }
            ```
    *   `500 Internal Server Error`。

##### **4.2. 写入操作 (Write Operations)**

###### **POST /api/v1/templates**
*   **描述:** 创建一个新的项目模板。请求体中 `projectName` 会被用作生成唯一的、URL-safe 的 `template_name`。
*   **请求体:** 一个符合《项目模板 Schema 规范 (V1.2)》的完整 JSON 对象。
*   **成功响应:**
    *   **状态码:** `201 Created`
    *   **Headers:** `Location: /api/v1/templates/{generated_template_name}`
    *   **响应体:** 包含新创建模板摘要的 `TemplateSummary` 对象。
*   **错误响应:**
    *   `400 Bad Request`: 请求体为空或非法的 JSON 格式。
    *   `401 Unauthorized`, `403 Forbidden`。
    *   `409 Conflict`:
        *   如果根据 `projectName` 生成的 `template_name` 已存在。
        *   如果请求体中的模板内容未能通过语法或语义验证（同 `GET`）。
    *   `500 Internal Server Error`。

###### **PUT /api/v1/templates/{template_name}**
*   **描述:** 创建或完整替换一个指定名称的项目模板。这是一个幂等操作。
*   **路径参数:** `template_name` (string, 必需)。
*   **请求体:** 一个符合《项目模板 Schema 规范 (V1.2)》的完整 JSON 对象。
*   **成功响应:**
    *   **状态码:** `200 OK` (替换现有模板) 或 `201 Created` (创建新模板)。
    *   **响应体:** 包含模板摘要的 `TemplateSummary` 对象。
*   **错误响应:**
    *   `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`。
    *   `409 Conflict`: 如果请求体中的模板内容未能通过语法或语义验证（同 `GET`）。
    *   `500 Internal Server Error`。

###### **DELETE /api/v1/templates/{template_name}**
*   **描述:** 删除一个指定的项目模板。
*   **路径参数:** `template_name` (string, 必需)。
*   **成功响应:**
    *   **状态码:** `204 No Content`
*   **错误响应:**
    *   `401 Unauthorized`, `403 Forbidden`, `404 Not Found`。
    *   `500 Internal Server Error`。

#### **5. 示例：调用流程与cURL**

**场景1: `L1-DP5` 获取模板配置**
```bash
# L1-DP5 (内容生成引擎) 请求获取模板 'default-engineering-v1-2' 的配置
# -H "Authorization" 用于安全认证
# -H "X-System-Component-ID" 用于身份标识
curl -X GET \
  -H "Authorization: Bearer <component_token>" \
  -H "X-System-Component-ID: L1-DP5" \
  'https://<hostname>/api/v1/templates/default-engineering-v1-2'

# 成功时返回 200 OK 和完整的模板 JSON
```

**场景2: 管理员创建一个新模板**
```bash
# 管理员通过UI代理组件创建一个新模板
# 注意：template_name 不在URL中，将由服务器根据 projectName 生成
curl -X POST \
  -H "Authorization: Bearer <admin_user_token>" \
  -H "X-System-Component-ID: Admin-UI-Proxy" \
  -H "Content-Type: application/json" \
  -d '{
    "templateSchemaVersion": "1.2",
    "projectName": "New Custom Robotics Template",
    "componentSettings": { ... }
  }' \
  'https://<hostname>/api/v1/templates'

# 成功时返回 201 Created，Location header 指向新资源，响应体包含摘要
# Location: /api/v1/templates/new-custom-robotics-template
# Body:
# {
#   "template_name": "new-custom-robotics-template",
#   "projectName": "New Custom Robotics Template",
#   "templateSchemaVersion": "1.2"
# }
```

**场景3: 管理员删除一个模板**
```bash
# 管理员删除一个过时的模板
curl -X DELETE \
  -H "Authorization: Bearer <admin_user_token>" \
  -H "X-System-Component-ID: Admin-UI-Proxy" \
  'https://<hostname>/api/v1/templates/old-template-v1'

# 成功时返回 204 No Content
```

---
Gemini 2.5 Pro 0605 writer