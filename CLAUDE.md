# CLAUDE.md — 선택점쟁이 (myLive)

다른 PC · 다른 세션에서 이 프로젝트를 이어서 작업할 때 가장 먼저 읽는 문서입니다.
사람을 위한 사용 설명은 [README.md](README.md), 참고 프로젝트 분석은 [GUIDE.md](GUIDE.md) 에 있습니다.

---

## 1. 사용자와 대화할 때 (가장 중요)

- **항상 한국어로만 답한다.** 사용자는 영어를 모른다. 요약 · 보고 · 질문 · 오류 설명 모두 한국어.
- 개발 용어는 쉽게 풀어서 설명한다. (예: "API 키" → "서비스를 쓰기 위한 비밀번호 같은 키")
- 사용자의 Windows PowerShell 은 `npm` 실행이 막혀 있다(실행 정책 보안 오류).
  명령어를 안내할 때는 **`npm.cmd`** 로 안내한다. (예: `npm.cmd install`, `npm.cmd run dev`)
- 시스템 보안 설정(실행 정책 등)은 직접 바꾸지 말고, 필요하면 사용자가 하도록 안내한다.

## 2. 반드시 지킬 원칙

1. **추가 비용 0원.** 유료 API · 유료 서비스를 쓰지 않는다. 무료 사용량이 있는 서비스는 카드 등록 없이만 안내한다.
2. **GUIDE.md 를 우선한다.** 프론트/백엔드 분리, API 키는 백엔드에만, `role/content` 메시지 형식, `// logic` / `// view` 주석 컨벤션.
3. **캐릭터**: 보라색 점쟁이 모자 · 망토를 쓴 웰시코기. 원본 시트는 `corgi-assets/corgi-character-sheet.png`.
4. **작업 결과는 `C:\Users\project\myLive` 에 두고 GitHub (https://github.com/livilia989/myLive, `main`) 에 올린다.**
5. 운세 표현은 재미용. "무조건 · 반드시 · 100% 정답" 같은 단정 금지, 판단은 사용자가 한다.
6. 정치 · 의료 · 법률 · 투자 · 대출 · 보험 · 안전 고민은 전문가 상담 안내 (운세식 확정 표현 금지).

## 3. 프로젝트 한눈에 보기

npm workspaces 모노레포 (`shared` · `backend` · `frontend`), 전부 TypeScript.

| 폴더 | 역할 |
|---|---|
| `shared/` | 공용 타입 · Zod 스키마 · **분석 엔진**(`analysis.ts`) · **대화 흐름**(`decisionFlow.ts`) · **Mock LLM**(`mock/`) |
| `backend/` | Express 5 REST API, LLM Provider Adapter(Mock / OpenAI 호환), 메모리 저장소 |
| `frontend/` | React 19 + Vite + Tailwind 3 + Zustand + React Hook Form + Framer Motion |

흐름: `UI → Zustand store → service → api(HTTP) 또는 mockApi(브라우저 안) → shared decisionFlow → LLMProvider`

- 단계(Stage) 전환과 **최종 추천은 LLM 이 아니라** `decisionFlow` + `analysis` 가 결정한다.
- 총점 = Σ(기준 점수 1~5 × 중요도 1~5). LLM(또는 Mock)은 추출 · 질문 · 선택지별 1~5점 평가만 담당.
- 세션은 브라우저 `localStorage`(`decision_sessions`, `decision_current_session`, `decision_settings`) 에 저장.
  요청 시 프론트가 세션 전체를 함께 보내므로 서버 메모리가 비어도 대화가 이어진다.

## 4. 새 PC 에서 시작하기

```bash
git clone https://github.com/livilia989/myLive.git
cd myLive
npm.cmd install
npm.cmd run dev
```

- 웹: http://localhost:5173 / API: http://localhost:8787 (Vite 가 `/api` 를 프록시)
- `.env` 는 git 에 없다. 필요하면 `backend/.env.example` → `backend/.env`, `frontend/.env.example` → `frontend/.env` 로 복사.
  없어도 기본값(Mock LLM)으로 동작한다.
- 상태별 코기 이미지는 `frontend/src/assets/corgi/` 에 커밋되어 있다. 시트를 바꾸면 `npm.cmd run corgi:crop -w frontend`.

## 5. 자주 쓰는 명령

| 명령 | 설명 |
|---|---|
| `npm.cmd run dev` | 백엔드 + 프론트 동시 실행 |
| `npm.cmd test` | Vitest 전체 (현재 23개 통과) |
| `npm.cmd run typecheck` | shared · backend · frontend 타입 검사 |
| `npm.cmd run lint` | ESLint |
| `npm.cmd run build` | 프론트 프로덕션 빌드 |
| `npm.cmd run check` | 위 네 가지 한 번에 |

**작업을 끝내기 전에 `test` · `typecheck` · `lint` · `build` 를 모두 통과시키고 커밋 · 푸시한다.**
커밋 메시지는 한국어, 형식 예: `feat: …`, `fix: …`.

## 6. 환경변수 요점

- `backend/.env`
  - `API_PORT=8787` — **`PORT` 가 아니다.** 미리보기 도구가 `PORT=5173` 을 넣어서 충돌했던 적이 있어 이름을 바꿨다.
  - `USE_MOCK_LLM=true` (기본) / `false` 면 `LLM_BASE_URL` · `LLM_MODEL` · `LLM_API_KEY` 사용 (OpenAI 호환)
  - `LLM_USE_RULE_DRAFT=true` — Mock 의 규칙 기반 초안을 LLM 에 함께 전달
- `frontend/.env`
  - `VITE_USE_MOCK_LLM=true` 면 서버 없이 브라우저 안에서 Mock 으로 실행 (설정 화면에서도 전환 가능)
  - `VITE_` 값은 브라우저에 노출되므로 비밀 값 금지

## 7. Mock LLM (규칙 기반 자연어 이해) — 현재 주력 엔진

위치: `shared/src/mock/`

- `parsers.ts` — 문장 분리, 고민 문장 고르기(`pickDecisionSentence`), 상황 요약(`extractSituation`),
  열린 질문 판별(`isOpenQuestion`), 예/아니오(`extractYesNoChoices`), 요청형(`extractRequestChoices`),
  `A할지 B할지`(`extractAlternativeVerbChoices`), 나열형(`extractGenericChoices`), 금액 · 기간 파서
- `scenarios.ts` — 시나리오별 질문 · 기준 · 점수표: `travel` · `food` · `phone` · `buy`(살까 말까) · `splitBill`(더치페이) · `generic`
- `MockLLMProvider.ts` — `detectChoices()` 에서 시나리오 선택 순서:
  지식 베이스(여행 · 음식 · 폰) → 살까 말까 → 더치페이/계산 → 예/아니오 → 나열형 → `A할지 B할지` → 요청형 → 선택지 질문

규칙을 추가할 때:
1. 사용자가 보낸 **실제 문장을 그대로** `shared/test/decisionFlow.test.ts` 에 테스트로 먼저 넣는다.
2. 파서/시나리오를 고친다. 기존 시나리오 테스트가 깨지지 않는지 확인한다.
3. 선택지 이름은 자연스러운 한국어로 (`~하기` / `~하지 않기`), 조사는 `utils.ts` 의 `josa()` 를 쓴다.

알려진 한계 (다음 개선 후보):
- "팀장님이 새 프로젝트를 **맡으라고** 하셨어" 같은 `~으라고` 지시형은 아직 요청으로 인식 못 함
- 지식 베이스에 없는 선택지는 기준별로 사용자에게 "어느 쪽이 나아?" 를 물어서 점수를 매김
- 문맥(대명사, 이전 대화 내용) 추론은 거의 없음

## 8. 실제 LLM — 그래픽카드 있는 환경에서 재시도 예정

지금까지 확인한 사실:
- 기존 PC(i5-1135G7, RAM 16GB, 내장 그래픽)에서 Ollama `qwen2.5:3b`:
  전체 대화 응답 **60~75초**, 사연 추출만 시켜도 **22초** + 선택지 품질 낮음 → 실사용 불가 판단.
- 그래서 규칙 엔진(Mock)을 강화하는 방향으로 진행했다.

그래픽카드 PC 에서 할 일:
1. Ollama 설치 후 한국어가 좋은 모델을 받아 비교한다. 후보: EXAONE 3.5 (7.8B), Qwen 2.5/3 (7B~14B), Gemma 3 (12B).
   (다운로드 전에 사용자에게 용량을 알리고 확인받는다.)
2. `backend/.env` 설정:
   ```
   USE_MOCK_LLM=false
   LLM_BASE_URL=http://localhost:11434/v1
   LLM_MODEL=<모델 이름>
   LLM_API_KEY=
   ```
3. 사용자가 보낸 사연 문장들(아래 9번)로 속도와 선택지 품질을 확인한다.
4. 추천 구조 — **하이브리드**: 규칙 엔진이 선택지를 못 찾거나 확신이 낮을 때만 LLM 에게 묻고,
   LLM 실패 · 시간 초과 시 규칙 엔진으로 되돌아간다. (`decisionFlow.generateValidatedResponse` 에 재시도 · fallback 이 이미 있음)
5. 무료 인터넷 AI 대안: Google Gemini API(AI Studio 무료 키, OpenAI 호환 주소 제공), Groq.
   API 키는 사용자가 직접 발급해서 `backend/.env` 에만 넣도록 안내한다 (채팅에 붙여넣지 않게).

관련 코드: `backend/src/llm/OpenAICompatibleProvider.ts`, `promptBuilder.ts`, `createProvider.ts`

## 9. 사용자가 실제로 테스트한 문장 (회귀 테스트로 유지)

- "후쿠오카와 오사카 중 어디로 여행 갈지 고민이야" → 기간 → 기준 → 후쿠오카 추천
- "친구와 4일간 놀기로 했는데 첫날 저녁은 친구가 샀어. 둘쨋날 저녁은 내가 결제했는데 더치페이를 하자는 이야기를 들었어. 그냥 내가 사는게 맞을까>"
  → `내가 사기` / `더치페이 하기` (예전에 '친구'를 선택지로 오인했던 버그)
- "화~금 총4일간 친구와 놀기로했어. 화-목은 저녁식사+카페 정도 갈거고 금요일은 점심에 1인22000원 짜리 오마카세를 먹을 예정이야. 화요일은 친구가 산다고했고, 수요일은 내가 결제했어. 아마 결제금액은 비슷할거야. 그럼에도 친구는 나에게 더치페이를 해달라고했어. 어떻게 하는게 좋을까?"
  → `더치페이 하기` / `번갈아 사기` / `큰 금액만 더치페이` (예전에 '화~금' 잘림, '어떻게 하기' 선택지 버그)

## 10. 작업 시 주의사항 (과거에 겪은 문제)

- **한글 입력 Enter**: 한글 조합 중 Enter 는 `isComposing=true` 로 온다. `ChatInput.tsx` 에서 조합이 끝난 뒤 전송하도록 처리되어 있다. 건드릴 때 한 번 Enter 로 전송되는지 확인.
- **Tailwind 3 색상 투명도**: CSS 변수 색은 `rgb(var(--x-rgb) / <alpha-value>)` 형식이어야 `bg-purple/40` 이 동작한다 (`globals.css` 의 `-rgb` 토큰).
- **브라우저 자동화로 테스트할 때**: 키 이름은 `"Return"` 이 아니라 `"Enter"` 를 써야 한다. 창이 숨겨져 있으면 스크린샷이 실패하므로 `get_page_text` / JS 로 확인한다.
- **메시지 렌더링**: `dangerouslySetInnerHTML` · Markdown→HTML 변환 금지 (텍스트로만 표시).
- **서버 로그**: 사용자의 고민 내용을 로그에 남기지 않는다 (메서드 · 경로 · 상태 코드 · 시간만).
- `corgi-assets/` 의 개별 PNG 들은 잘못 잘린 이미지라 git 에서 제외했다 (시트만 커밋).
- 줄바꿈은 `.gitattributes` 로 LF 고정.

## 11. 폴더 지도 (자주 여는 파일)

```
shared/src/decisionFlow.ts          대화 단계 · 검증 · 재시도 · fallback · 결과 메시지
shared/src/analysis.ts              점수 계산 · 추천 · 이유 · 결과가 바뀌는 조건
shared/src/mock/parsers.ts          한국어 문장 이해 규칙
shared/src/mock/scenarios.ts        시나리오별 질문 · 점수표
shared/src/mock/MockLLMProvider.ts  시나리오 선택
shared/test/decisionFlow.test.ts    대화 흐름 테스트 (실제 사용자 문장 포함)
backend/src/llm/                    실제 LLM 연결
frontend/src/features/decision/     store · service · api · repository
frontend/src/pages/                 홈 · 새 고민 · 채팅 · 결과 · 기록 · 설정
frontend/src/components/corgi/      코기 이미지 자동 선택 (corgiAssets.ts)
```
