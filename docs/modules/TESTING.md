**测试（Testing）模块**

- **功能概述**: 项目采用单元测试（Vitest）、集成测试与端到端测试（Playwright），并用 MSW（mock service worker）做 API 模拟。

**实现要点**

- 单元测试：`vitest` + `@testing-library/react` 用于组件级测试、工具函数与 Hook 的单元测试。
- 集成与 e2e：Playwright 用于浏览器交互测试，例如登录、编辑、协作流程。
- Mock：使用 `mocks/handlers.ts` + `mocks/server.ts` 在测试环境中拦截 API，提供稳定的测试场景。

**关键文件**

- `vitest.config.ts`, `vitest.setup.ts`: vitest 配置。
- `mocks/handlers.ts`, `mocks/server.ts`：MSW 用于拦截网络请求。
- `tests/unit/*`, `tests/integration/*`, `tests/e2e/*`：测试目录与示例。

**内部逻辑/细节**

- Mock 数据：`mocks/handlers.ts` 提供指定 API 的返回，方便测试时模拟权限、笔记数量、离线场景等。
- e2e 流程：Playwright 使用 `playwright.config.ts` 配置测试环境，触发真实浏览器行为以验证协作、编辑器、PWA 行为。
- CI：通过运行 `npm test` 或 `npm run e2e` 在 CI 中运行测试套件。
