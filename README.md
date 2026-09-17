# 🔮 선택점쟁이

> **고민은 맡겨. 내가 같이 골라줄게!**
> 운세는 재미로, 선택은 나답게.

보라색 점쟁이 모자와 망토를 쓴 귀여운 웰시코기가 사용자의 고민을 대화로 듣고,
**선택지 · 중요 기준 · 추가 정보**를 차근차근 모은 뒤 **가중치 점수 분석**으로 선택지를 비교해
운세 스타일로 친근하게 결과를 알려주는 챗봇 웹서비스입니다.

- 점쟁이처럼 말하지만, **판단은 사용자가** 합니다. ("무조건 A", "100% 정답" 같은 단정 표현 금지)
- 운세 문구는 감성 UX 이고, **실제 근거는 분석 엔진의 점수와 비교 카드**로 제공합니다.
- **추가 비용 0원**: Mock LLM 으로 전체 흐름이 동작하고, 실제 LLM 은 로컬 **Ollama**(무료)로 연결할 수 있습니다.

---

## 목차

1. [기술 스택](#1-기술-스택)
2. [실행 방법](#2-실행-방법)
3. [폴더 구조](#3-폴더-구조)
4. [환경변수](#4-환경변수)
5. [Mock LLM](#5-mock-llm)
6. [실제 LLM 연결 (Ollama · OpenAI 호환)](#6-실제-llm-연결-ollama--openai-호환)
7. [API 명세](#7-api-명세)
8. [데이터 구조](#8-데이터-구조)
9. [대화 흐름과 분석 방식](#9-대화-흐름과-분석-방식)
10. [캐릭터 이미지](#10-캐릭터-이미지)
11. [접근성 · 보안 · 반응형](#11-접근성--보안--반응형)
12. [테스트](#12-테스트)
13. [향후 확장 방향](#13-향후-확장-방향)

---

## 1. 기술 스택

| 영역 | 기술 |
|---|---|
| Frontend | React 19, TypeScript, Vite, React Router, Tailwind CSS 3, Zustand, React Hook Form, Zod, Framer Motion, Lucide React |
| Backend | Node.js, Express 5, TypeScript (tsx 로 실행), REST API |
| Shared | 공용 타입 · Zod 스키마 · 분석 엔진 · 대화 흐름(Stage Machine) · Mock LLM |
| LLM | Provider Adapter 구조 — `MockLLMProvider`, `OpenAICompatibleProvider` (Ollama / OpenAI / vLLM / 사내 API) |
| Storage | 브라우저 `localStorage` (Repository Pattern, 이후 DB 로 교체 가능) · 서버 메모리 저장소 |
| 품질 | Vitest (단위 · API 테스트), ESLint, `tsc --noEmit` |

> 참고 프로젝트(`chat-chef-frontend-boilerplate`) 분석 내용은 [GUIDE.md](GUIDE.md) 에 있습니다.
> GUIDE 의 원칙(프론트/백엔드 분리, API 키는 백엔드에만, `role/content` 메시지 포맷, `// logic` / `// view` 주석 컨벤션)을 따랐습니다.

---

## 2. 실행 방법

### 요구 사항

- Node.js 22 이상 (개발 환경: Node 24)
- (선택) [Ollama](https://ollama.com) — 실제 LLM 을 무료로 쓰고 싶을 때

### 설치 & 실행

```bash
npm install
```

```bash
npm run dev
```

- 웹: http://localhost:5173
- API: http://localhost:8787 (웹 개발 서버가 `/api` 요청을 자동으로 넘겨줍니다)

`backend/.env`, `frontend/.env` 가 없어도 기본값(Mock LLM)으로 동작합니다. 설정을 바꾸려면 예시 파일을 복사하세요.

```bash
cp backend/.env.example backend/.env
```

```bash
cp frontend/.env.example frontend/.env
```

### 그 밖의 명령어

| 명령어 | 설명 |
|---|---|
| `npm run dev:web` | 프론트엔드만 실행 |
| `npm run dev:api` | 백엔드만 실행 |
| `npm run build` | 프론트엔드 프로덕션 빌드 (`frontend/dist`) |
| `npm run start` | 백엔드 실행 (watch 없음) |
| `npm run typecheck` | shared · backend · frontend 타입 검사 |
| `npm run lint` | ESLint |
| `npm test` | Vitest 전체 테스트 |
| `npm run check` | 타입 검사 + 린트 + 테스트 + 빌드 한 번에 |
| `npm run corgi:crop -w frontend` | 캐릭터 시트를 상태별 이미지로 자르기 |

> 서버 없이 체험하려면 앱의 **설정 → 대화 엔진 → 브라우저 Mock 모드**를 선택하거나 `VITE_USE_MOCK_LLM=true` 로 실행하세요.

---

## 3. 폴더 구조

```
myLive/
├─ GUIDE.md                    # 참고 프로젝트 분석 · 개발 가이드
├─ README.md
├─ package.json                # npm workspaces (shared · backend · frontend)
├─ corgi-assets/
│  └─ corgi-character-sheet.png   # 원본 캐릭터 시트
│
├─ shared/                     # frontend · backend 공용 (@mylive/shared)
│  ├─ src/
│  │  ├─ types.ts              # 데이터 모델 · LLM 입출력 타입
│  │  ├─ schemas.ts            # Zod 스키마 (LLMResponseSchema 포함)
│  │  ├─ analysis.ts           # 분석 엔진 (가중치 × 점수)
│  │  ├─ decisionFlow.ts       # 대화 단계(Stage) 관리 · 검증 · 재시도 · fallback
│  │  ├─ stages.ts             # 단계 라벨 · 상태 문구
│  │  ├─ utils.ts              # 조사 처리 · 단정 표현 완화 · 고위험 주제 감지
│  │  └─ mock/                 # Mock LLM (파서 · 시나리오 · Provider)
│  └─ test/
│
├─ backend/                    # REST API (@mylive/backend)
│  ├─ src/
│  │  ├─ app.ts · server.ts · config.ts
│  │  ├─ routes/decisions.ts
│  │  ├─ services/decisionService.ts
│  │  ├─ llm/                  # LLMProvider · MockLLMProvider · OpenAICompatibleProvider · promptBuilder
│  │  ├─ schemas/decisionSchemas.ts
│  │  ├─ repositories/         # DecisionRepository · InMemoryDecisionRepository
│  │  └─ utils/                # logger (고민 내용 미기록) · httpError
│  ├─ test/api.test.ts
│  └─ .env.example
│
└─ frontend/                   # 웹 클라이언트 (@mylive/frontend)
   ├─ scripts/crop-corgi.mjs   # 캐릭터 시트 → 상태별 이미지
   ├─ public/assets/corgi/     # 기본 SVG 코기 · 파비콘
   └─ src/
      ├─ app/                  # App · router(lazy) · providers(애니메이션 설정)
      ├─ assets/corgi/         # 상태별 코기 이미지 (자동 인식)
      ├─ components/
      │  ├─ common/            # Button · IconButton · Modal · EmptyState · LoadingDots · ProgressBar · Toast
      │  ├─ corgi/             # CorgiAvatar · CorgiCharacter · CorgiStatus · corgiAssets
      │  ├─ chat/              # ChatLayout · ChatHeader · ChatMessageList · ChatMessageBubble · ChatInput · QuickReplyButtons · TypingIndicator · DateDivider
      │  ├─ decision/          # DecisionProgress · DecisionResultCard · ChoiceComparisonCard/Chart · CriterionScoreBar · ReasonList · TradeoffCard · DecisionContextSummary · ResultActions · RecommendationBadge
      │  └─ layout/            # AppShell · MobileBottomNav
      ├─ pages/                # Home · NewDecision · DecisionChat · DecisionResult · History · Settings · NotFound
      ├─ features/
      │  ├─ decision/          # types · schemas · store(Zustand) · service · api · mockApi · repository · analysis · prompts · utils
      │  └─ settings/store.ts
      ├─ lib/                  # apiClient · storage · date · id
      └─ styles/globals.css    # 색상 토큰 · 코기 애니메이션 · reduced motion
```

**계층 분리**

```
UI(pages · components) → Zustand store → service → api(HTTP) / mockApi(브라우저)
                                            ↘ repository(localStorage)
backend: routes → DecisionService → decisionFlow(shared) → LLMProvider
                                  ↘ DecisionRepository
```

---

## 4. 환경변수

### backend/.env

| 이름 | 기본값 | 설명 |
|---|---|---|
| `API_PORT` | `8787` | API 서버 포트 |
| `CORS_ORIGIN` | `http://localhost:5173` | 허용 출처 (쉼표로 여러 개) |
| `USE_MOCK_LLM` | `true` | `true` 면 Mock LLM, `false` 면 OpenAI 호환 API |
| `LLM_BASE_URL` | `http://localhost:11434/v1` | OpenAI 호환 엔드포인트 (기본: 로컬 Ollama) |
| `LLM_MODEL` | `qwen2.5:3b` | 모델 이름 |
| `LLM_API_KEY` | (비어 있음) | 유료 API 를 쓸 때만. **절대 frontend 에 넣지 않습니다** |
| `LLM_TIMEOUT_MS` | `180000` | LLM 응답 제한 시간 |
| `LLM_USE_RULE_DRAFT` | `true` | 규칙 기반(Mock) 초안을 LLM 에 함께 전달해 소형 모델 정확도 보완 |

### frontend/.env

| 이름 | 기본값 | 설명 |
|---|---|---|
| `VITE_API_BASE_URL` | (비어 있음) | 비우면 같은 출처의 `/api` 사용 |
| `VITE_USE_MOCK_LLM` | `false` | `true` 면 서버 없이 브라우저 Mock 모드가 기본값 |

> `VITE_` 로 시작하는 값은 브라우저에 그대로 노출되므로 비밀 값을 넣지 마세요.

---

## 5. Mock LLM

`shared/src/mock/MockLLMProvider.ts` 는 실제 LLM 과 **같은 응답 스키마(`DecisionLLMResponse`)** 를 반환합니다.
backend(`USE_MOCK_LLM=true`)와 frontend 브라우저 Mock 모드가 같은 구현을 사용합니다.

단순 문자열 비교가 아니라 다음을 유연하게 처리합니다.

- 조사 · 구분자: `A와 B 중`, `A랑 B`, `A vs B`, `A, B, C`, `A 아니면 B`, `짜장면 짬뽕 뭐 먹지`
- 동의어: `자장면/짜장`, `iPhone/아이폰/애플폰`, `하카타/후쿠오카`, `맛있는 거/먹거리 → 맛집`
- 금액 · 기간: `30만원`, `5천원`, `100만원 이상`, `2박 3일`, `당일치기`, `일주일`
- 부정 표현: `매운 거 싫어`, `국물 없어도 돼`, `안 사면 계속 생각날 듯`
- 후보가 하나뿐이면 다른 후보를 묻고, `추천해줘` 면 후보를 제안

### 내장 시나리오

| 시나리오 | 예시 입력 | 질문 흐름 |
|---|---|---|
| ✈️ 여행 | 후쿠오카와 오사카 중 어디로 여행 갈지 고민이야 | 여행 기간 → 중요 기준(맛집/쇼핑/관광/휴식/가성비/이동 편의성) → 분석 |
| 🍽️ 음식 | 짜장면이랑 짬뽕 중 고민이야 | 매운맛 선호 → 국물 선호 → 분석 |
| 📱 스마트폰 | 아이폰이랑 갤럭시 중 고민이야 | 예산 → 기준(카메라/게임/생태계/배터리) → (생태계 선택 시) 보유 기기 → 분석 |
| 🛍️ 살까 말까 | 이거 살까 말까 고민이야 | 가격 → 사용 빈도 → 대체재 → 후회 가능성 → 분석 |
| ✨ 일반 | 헬스장이랑 수영장 중 고민이야 | 중요 기준 → 기준별로 "어느 쪽이 나아?" → 분석 |
| 💬 사연형 예/아니오 | 친구와 4일간 놀기로 했는데 … 그냥 내가 사는 게 맞을까? | 상황 요약 → '내가 사기' vs '더치페이 하기' → 기준(관계 · 공정함 · 금전 부담 …) → 기준별 비교 → 분석 |

| 💸 계산 · 더치페이 | 화~금 친구와 놀기로 했어 … 친구는 더치페이를 해달라고 했어. 어떻게 하는 게 좋을까? | 상황 요약 + 사실 추출(누가 냈는지 · 금액 비슷함 · 큰 지출 · 상대 요청) → 더치페이 / 번갈아 사기 / 큰 금액만 더치페이 → 기준 → 내 마음 → 분석 |

**자연어 이해 규칙**
- 문장 분리: 마침표 · 물음표 뒤에서만 나눠 `화~금`, `화-목`, `1.5만원` 을 보존
- 열린 질문(`어떻게 하는 게 좋을까`, `어떡하지`, `뭐가 나을까`)은 사연에서 선택지를 추론
- 요청형(`~를 빌려달라고 했어`, `~하자고 했어`) → `~빌려주기` / `~빌려주지 않기`
- `A할지 B할지` → `A하기` / `B하기` (`집에서 쉴지 친구 만날지` → `집에서 쉬기` / `친구 만나기`)

사연형 입력은 마지막 질문 문장에서 고민을 찾고, 앞 문장들은 상황 요약으로 보여줍니다.
`~하는 게 맞을까`, `~해도 될까`, `~해야 할까`, `~할까 말까` 는 `~하기` / `~하지 않기` 선택지로 바뀌고,
친구 · 가족 · 동료 등 사람이 등장하면 관계 중심 기준을 추천합니다.

지식 베이스: 여행지 11곳, 음식 19종, 스마트폰 3종.

---

## 6. 실제 LLM 연결 (Ollama · OpenAI 호환)

### 무료: 로컬 Ollama

```bash
ollama pull qwen2.5:3b
```

`backend/.env`

```
USE_MOCK_LLM=false
LLM_BASE_URL=http://localhost:11434/v1
LLM_MODEL=qwen2.5:3b
LLM_API_KEY=
```

그 뒤 `npm run dev` 로 다시 실행하고, 앱의 **설정** 화면에서 연결 상태를 확인할 수 있습니다.

> CPU 만 있는 PC 에서 3B 모델은 한 번 답하는 데 1분 정도 걸릴 수 있습니다. 빠른 체험은 Mock 모드를 권장합니다.

### 안정성 장치

1. LLM 응답은 `LLMResponseSchema`(Zod)로 검증합니다.
2. 검증 실패 시 **1회 재시도**, 그래도 실패하면 **Mock 응답으로 fallback** 해서 화면이 깨지지 않습니다.
3. LLM 서버에 연결할 수 없으면 `502 LLM_UNAVAILABLE` → 화면에 "수정구슬이 잠깐 흐려졌어요" + **다시 시도** 버튼 (대화 내용 유지).
4. 단계 전환과 최종 추천은 LLM 이 아니라 `decisionFlow` · `analysis` 가 결정합니다.
5. 단정 표현(`무조건`, `반드시`, `100% 정답` 등)은 자동으로 부드럽게 바뀝니다.

### 새 Provider 추가

`LLMProvider` 인터페이스 하나만 구현하면 됩니다.

```ts
interface LLMProvider {
  readonly name: string;
  generateDecisionResponse(input: DecisionLLMInput): Promise<DecisionLLMResponse>;
}
```

`backend/src/llm/createProvider.ts` 에서 환경변수에 따라 연결하세요. frontend 는 Provider 종류를 알 필요가 없습니다.

---

## 7. API 명세

기본 경로: `/api`. 모든 요청 · 응답은 JSON.
클라이언트는 localStorage 의 최신 세션(`session`)을 함께 보낼 수 있어, 서버 메모리가 초기화되어도 대화를 이어갈 수 있습니다.

| Method | Path | Body | 응답 |
|---|---|---|---|
| `GET` | `/api/health` | – | `{ status, provider, model?, llmReachable }` |
| `POST` | `/api/decisions` | `{ title?, category? }` | `201 { session }` |
| `GET` | `/api/decisions` | – | `{ decisions: DecisionSummary[] }` |
| `GET` | `/api/decisions/:id` | – | `{ session }` / `404` |
| `DELETE` | `/api/decisions/:id` | – | `204` |
| `POST` | `/api/decisions/:id/messages` | `{ content, session?, action? }` | `{ session }` |
| `POST` | `/api/decisions/:id/analyze` | `{ session?, weights? }` | `{ session }` (기준 중요도를 바꿔 재분석) |
| `POST` | `/api/decisions/:id/retry` | `{ session? }` | `{ session }` (마지막 사용자 메시지부터 다시 처리) |
| `POST` | `/api/decisions/:id/feedback` | `{ helpful, comment? }` | `201 { ok: true }` |

- `action`: `"edit_choices"`(선택지 수정 시작) · `"complete"`(결과 저장)
- `weights`: `{ [criterionId]: 1~5 }`
- 오류 형식: `{ error: "BAD_REQUEST" | "NOT_FOUND" | "LLM_UNAVAILABLE" | "INTERNAL_ERROR", message }`

---

## 8. 데이터 구조

전체 타입은 [shared/src/types.ts](shared/src/types.ts), 검증 스키마는 [shared/src/schemas.ts](shared/src/schemas.ts) 에 있습니다.

```ts
type DecisionStage =
  | "greeting" | "understanding" | "collecting_choices" | "collecting_criteria"
  | "asking_questions" | "analyzing" | "presenting_result" | "completed";

interface DecisionSession {
  id: string;
  title: string;
  category?: string;
  stage: DecisionStage;
  messages: ChatMessage[];      // { id, role, type, content, createdAt, options?, metadata? }
  context: DecisionContext;     // { topic, category, choices, criteria, userPreferences, constraints, missingInformation }
  result?: DecisionResult;      // { recommendedChoiceId, summary, fortuneMessage, confidence, choiceResults, keyReasons, tradeoffs, alternativeScenario?, caution? }
  createdAt: string;
  updatedAt: string;
}
```

localStorage 키

| 키 | 내용 |
|---|---|
| `decision_sessions` | 세션 배열 (최대 100개, 최근 수정 순) |
| `decision_current_session` | 현재 세션 id |
| `decision_settings` | 대화 엔진 · 애니메이션 설정 |

데이터가 깨져 있으면 오류 없이 빈 상태로 복구하고, 형식이 잘못된 세션만 걸러냅니다.

---

## 9. 대화 흐름과 분석 방식

### 대화 흐름

```
홈 → 고민 이야기하기 → 챗봇 화면 → 자연어 고민 입력
  → [understanding] 고민 파악
  → [collecting_choices] 선택지 확인 (2개 미만이면 질문)
  → [asking_questions] 추가 질문 (기간 · 예산 · 선호 …)
  → [collecting_criteria] 중요 기준 확인
  → [analyzing] 분석 엔진 계산
  → [presenting_result] 운세 스타일 결과
  → [completed] 결과 저장 → 기록에서 재확인
```

역할 분리

| 담당 | 하는 일 |
|---|---|
| LLM (Mock/실제) | 자연어 이해, 주제 · 선택지 · 기준 · 선호 추출, 필요한 질문 결정, 선택지별 기준 평가(1~5), 자연어 응답 |
| decisionFlow | 단계 전환, 질문 개수 제한, 응답 검증 · 재시도 · fallback, 고위험 주제 안내 |
| 분석 엔진 | 가중치 계산, 총점, 기준별 기여도, 강점 · 약점, 적합 상황, 결과가 바뀌는 조건, **최종 추천** |

### 분석 엔진 ([shared/src/analysis.ts](shared/src/analysis.ts))

- 기준 중요도 `weight`: 1~5 (먼저 말한 기준일수록 높게: 5 → 4 → 3)
- 선택지 기준 점수 `score`: 1~5
- **총점 = Σ(score × weight)**, 참고 점수 = 총점 ÷ 만점 × 100

예) 2박 3일 · 맛집(5) · 이동 편의성(4) · 일정 적합도(3)

| 선택지 | 맛집 | 이동 편의성 | 일정 적합도 | 총점 | 참고 점수 |
|---|---|---|---|---|---|
| 후쿠오카 | 4×5=20 | 5×4=20 | 5×3=15 | 55/60 | **92점** |
| 오사카 | 5×5=25 | 3×4=12 | 3×3=9 | 46/60 | 77점 |

- 신뢰도: 1·2위 점수 차 15점 이상 `high`, 6점 이상 `medium`, 그 외 `low`
- 추천 이유: `(1위 점수 − 2위 점수) × 중요도` 가 큰 기준 순
- 결과가 바뀌는 조건: 기준 하나를 "가장 중요한 기준"으로 바꿨을 때 1위가 바뀌는지 계산
- 결과 화면에서 기준 중요도를 슬라이더로 바꿔 **다시 분석**할 수 있습니다.
- 결과 화면에 항상 "이 결과는 네가 중요하게 생각한 기준을 바탕으로 한 참고용 분석이야." 를 표시합니다.

### 고위험 주제

정치 · 의료 · 법률 · 투자 · 대출 · 보험 · 안전 관련 고민은 전문가 상담이 필요하다고 안내하고,
운세식 표현 대신 **"🧭 선택 기준 정리"** 로 결과를 보여줍니다.

---

## 10. 캐릭터 이미지

`CorgiAvatar`(원형 프로필)와 `CorgiCharacter`(큰 캐릭터)로 추상화되어 있어 상태별 이미지를 쉽게 교체할 수 있습니다.

| 상태 (`state`) | 파일 (`frontend/src/assets/corgi/`) |
|---|---|
| `idle` | `corgi-idle.png` |
| `listening` | `corgi-listening.png` |
| `thinking` | `corgi-thinking.png` |
| `analysis` | `corgi-analysis.png` |
| `happy` | `corgi-happy.png` |
| `surprised`, `error` | `corgi-surprised.png` |
| `sleeping` | `corgi-sleeping.png` |
| 채팅 프로필 | `corgi-avatar.png` |
| 홈 화면 장면 | `corgi-scene.png` |

- 이미지는 빌드 시 자동으로 인식되며(`import.meta.glob`), 없는 파일은 비슷한 상태 → 프로필 → 기본 SVG 순으로 대체됩니다.
- 원본 시트 `corgi-assets/corgi-character-sheet.png` 를 바꾼 뒤 아래 명령으로 다시 자를 수 있습니다.

```bash
npm run corgi:crop -w frontend
```

- CorgiAvatar props: `size`, `state`, `showBorder`, `className`, `alt`
- 애니메이션: idle 상하 움직임 · listening 좌우 흔들림 · thinking/analysis 반짝임 · happy 확대 · error 흔들림 (`prefers-reduced-motion` 존중)

---

## 11. 접근성 · 보안 · 반응형

**접근성**
- 대화 영역 `role="log"` + `aria-live`, 상태 문구 `aria-live`, 모든 아이콘 버튼 `aria-label`
- 키보드: Enter 전송, Shift+Enter 줄바꿈, 한글 조합 중 Enter 도 한 번에 전송, 모달 포커스 가두기 · Esc 닫기, 본문 바로가기 링크
- `:focus-visible` 포커스 표시, 작은 글씨는 대비 4.5:1 이상 색상 사용
- 진행 단계 · 신뢰도 · 순위는 색과 함께 텍스트로도 전달
- OS 의 동작 줄이기 설정 + 앱 설정에서 애니메이션 줄이기

**보안**
- API 키는 backend 환경변수에만 존재, 모든 LLM 호출은 backend 에서 처리
- `dangerouslySetInnerHTML` 미사용, 메시지는 텍스트로만 렌더링 (Markdown → HTML 변환 없음)
- 요청 본문은 Zod 로 검증, 본문 크기 1MB 제한
- 서버 로그에는 메서드 · 경로 · 상태 코드 · 처리 시간만 기록 (고민 내용 미기록)
- 개인정보를 요구하지 않음

**반응형**
- 모바일: 전체 화면 챗봇, 고정 헤더 · 스크롤 메시지 · 고정 입력창, 320px 에서 가로 스크롤 없음
- 데스크톱: 크림색 배경 위 가운데 정렬 챗봇 앱(최대 480px), 결과 페이지 최대 900px

---

## 12. 테스트

```bash
npm test
```

| 파일 | 내용 |
|---|---|
| `shared/test/decisionFlow.test.ts` | 여행 · 음식 · 스마트폰 · 살까 말까 · 일반 시나리오 전체 흐름, 선택지 수정, 가중치 재분석, 고위험 안내 |
| `backend/test/api.test.ts` | REST API 전체 흐름, 400 검증, LLM 오류 502, 형식 오류 시 Mock fallback |
| `frontend/src/features/decision/repository.test.ts` | localStorage 저장 · 삭제, 깨진 데이터 복구, 저장소 접근 실패 |

브라우저에서 직접 확인한 항목: 홈 · 새 고민 · 채팅 · 결과 · 기록 · 설정 화면, 빠른 답변, Enter 전송, 오류 → 다시 시도,
선택지 수정, 결과 저장 → 기록 표시, 브라우저 Mock 모드, 320px · 데스크톱 레이아웃.

---

## 13. 향후 확장 방향

- **DB 저장소**: `DecisionRepository` / `SessionRepository` 구현체를 SQLite · PostgreSQL 로 교체, 로그인 기반 기록 동기화
- **Provider 추가**: `OllamaProvider`(네이티브 API), `VLLMProvider`, 사내 LLM 게이트웨이
- **스트리밍 응답**: SSE 로 코기의 답변을 한 글자씩 표시
- **지식 베이스 확장**: 여행지 · 음식 · 전자기기 데이터를 JSON/DB 로 분리해 관리
- **결과 이미지 카드**: 공유용 이미지 생성, 링크 공유
- **피드백 활용**: 도움됨/아쉬움 데이터로 질문 · 기준 추천 개선
- **PWA**: 홈 화면 설치 · 오프라인 브라우저 Mock 모드
