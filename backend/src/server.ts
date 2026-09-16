import { createApp } from "./app";
import { config } from "./config";
import { logger } from "./utils/logger";

const app = createApp(config);

app.listen(config.port, () => {
  const mode = config.useMockLLM ? "Mock LLM" : `OpenAI 호환 LLM (${config.llm.baseUrl}, ${config.llm.model})`;
  logger.info(`🔮 선택점쟁이 API 가 http://localhost:${config.port} 에서 실행 중입니다. [${mode}]`);
});
