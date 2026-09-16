# myLive 챗봇 개발 가이드

> 기준 프로젝트: `C:\Users\project\chat-chef\chat-chef-frontend-boilerplate` ("맛있는 쉐프")
> 이 문서는 기준 프로젝트를 분석한 내용과, 그 구조를 바탕으로 `myLive`에 새 챗봇을 만드는 절차를 정리한 문서입니다.

---

## 1. 기준 프로젝트 분석

### 1.1 한 줄 요약
냉장고 재료를 입력받아 AI(ChatGPT 가정)에게 레시피를 물어보는 **모바일 화면 형태의 React 챗봇 프론트엔드 보일러플레이트**입니다.
**백엔드와 AI 연동 코드는 없고**, 화면(UI)과 뼈대만 있으며 핵심 로직은 `TODO`로 비어 있습니다.

### 1.2 기술 스택

| 구분 | 사용 기술 | 비고 |
|---|---|---|
| 프레임워크 | React 18.2 | 함수형 컴포넌트 + Hooks |
| 빌드 도구 | Create React App (`react-scripts` 5.0.1) | CRA는 공식 지원 중단됨 → 새 프로젝트는 Vite 권장 (3장 참고) |
| 라우팅 | react-router-dom 6.16 | `BrowserRouter` + `Routes` |
| 스타일 | Tailwind CSS 3.3 + PostCSS + Autoprefixer | 커스텀 색상 `chef-*` |
| 아이콘 | react-icons 5.3 | `FaRegTrashAlt` 사용 |
| 로딩 UI | react-spinners 0.14 | `MoonLoader`, `PulseLoader` |
| 패키지 매니저 | npm / yarn 둘 다 lock 파일 존재 | 하나만 쓰는 것을 권장 |

### 1.3 폴더 구조

```
chat-chef-frontend-boilerplate/
├─ public/
│  ├─ index.html          # 루트 div (height:100%, overflow:hidden), title "맛있는 쉐프"
│  └─ images/             # arrow-prev, send, chef, hero, check, male/female(미사용) 등
├─ src/
│  ├─ index.js            # ReactDOM.createRoot + BrowserRouter
│  ├─ App.js              # 라우트 정의
│  ├─ index.css           # tailwind 지시어 + span { white-space: pre-wrap }
│  ├─ pages/
│  │  ├─ Home.jsx         # 시작 화면
│  │  ├─ Info.jsx         # 재료 입력 화면
│  │  └─ Chat.jsx         # 채팅 화면
│  └─ components/
│     ├─ Button.jsx       # 하단 큰 버튼 (text, color, onClick)
│     ├─ AddButton.jsx    # "+ 재료 추가" 버튼 (onClick)
│     ├─ InfoInput.jsx    # 재료 입력 한 줄 + 삭제 버튼 (content)
│     ├─ MessageBox.jsx   # 메시지 목록 렌더 + 자동 스크롤 + 로딩 말풍선
│     └─ PrevButton.jsx   # 뒤로가기 버튼
├─ tailwind.config.js
└─ postcss.config.js
```

### 1.4 화면 흐름

```
 "/"  Home  ──[Get started]──▶  "/info"  Info  ──[Next]──▶  "/chat"  Chat
  시작 소개                        재료 목록 입력                AI와 대화
```

| 경로 | 페이지 | 상태(state) | 현재 구현 상태 |
|---|---|---|---|
| `/` | `Home` | 없음 | `useNavigate`로 `/info` 이동 ✅ |
| `/info` | `Info` | `ingredientList` (`[{ id, label, text }]`) | 추가/삭제/입력값 반영 ❌ (setter 없음) |
| `/chat` | `Chat` | `value`, `messages`, `isInfoLoading`, `isMessageLoading` | 입력만 동작, 전송·AI 호출 ❌ |

### 1.5 컴포넌트 상세

- **`Button({ text, color, onClick })`** – `mt-auto`로 화면 하단에 붙는 둥근 버튼. `color`는 Tailwind 배경 클래스 문자열을 그대로 받음.
- **`AddButton({ onClick })`** – 테두리형 추가 버튼. 문구가 "+ 재료 추가"로 하드코딩되어 있음.
- **`InfoInput({ content })`** – `content = { label, text }`. `label`은 input의 id/name, `text`는 라벨 문구. **input이 비제어(uncontrolled)** 상태이고 `onRemove`는 `console.log`만 수행.
- **`MessageBox({ messages, isLoading })`**
  - `messages`: `[{ role: "user" | "assistant", content: string }]` → OpenAI/Claude 등 LLM API의 메시지 포맷과 동일
  - `role === "user"`면 오른쪽 초록 말풍선, 그 외는 왼쪽 회색 말풍선 + 쉐프 아바타
  - `isLoading`이면 마지막에 `PulseLoader` 말풍선 표시
  - `messages.length` 변경 시 하단 `ref`로 `scrollIntoView` (자동 스크롤)
- **`PrevButton()`** – 좌상단 절대 위치 버튼. `console.log`만 있고 실제 뒤로가기 미구현.

### 1.6 스타일 규칙 (tailwind.config.js)

- 커스텀 색상: `chef-green-500 #46A195`(메인), `chef-pink-*`, `chef-blue-*`(보조), `chef-gray-100~700`
- 커스텀 크기: `text-4.5xl`, `text-none`(글자 숨김용 font-size 0), `w-168/h-168`, `-top-104`, `min-w-10`, `max-w-3/4` 등
- 레이아웃 패턴: 모든 페이지 루트가 `w-full h-full px-6 pt-10 break-keep overflow-auto` → 내부 `h-full flex flex-col` → 하단 요소 `mt-auto`
- 배경 장식: `fixed -z-10` 큰 원(`<i>`) + 히어로 이미지
- 한국어 줄바꿈: `break-keep`, 메시지 줄바꿈: `whitespace-pre-wrap`

### 1.7 코드 컨벤션

- 컴포넌트 안을 `// logic` 과 `// view` 주석으로 구분
- JSX 영역을 `{/* START:xxx */}` / `{/* END:xxx */}` 주석으로 구분
- 페이지는 `src/pages`, 재사용 UI는 `src/components`, 파일 확장자 `.jsx`
- 이미지 경로는 `public` 기준 `./images/...`

### 1.8 미완성/개선 필요 사항 (새 프로젝트에서 바로잡을 것)

| # | 위치 | 문제 | 개선 방법 |
|---|---|---|---|
| 1 | `Info.jsx` | `useState` setter 없음, 재료 추가/삭제/수정 불가 | `setIngredientList` + `onChange`/`onRemove` 콜백을 `InfoInput`에 전달 |
| 2 | `InfoInput.jsx` | 비제어 input, 삭제 기능 없음 | `value`, `onChange`, `onRemove` props 추가 |
| 3 | `Chat.jsx` | 전송 시 메시지 추가·AI 호출 없음 | 4장 흐름대로 구현 |
| 4 | `Chat.jsx` | `isMessageLoading` 초기값 `true` → 항상 로딩 말풍선 표시 | 초기값 `false` |
| 5 | `Chat.jsx` | 빈 메시지 전송 방지 없음, 전송 후 입력창 초기화 없음 | `trim()` 검사 후 `setValue("")` |
| 6 | `PrevButton.jsx` | 뒤로가기 미동작 | `navigate(-1)` |
| 7 | `Info.jsx` | 재료 데이터를 Chat으로 넘기지 않음, 미사용 `import Chat` | `navigate("/chat", { state: { ingredientList } })` 또는 Context |
| 8 | 전반 | 함수명 오타 `hadleChange`, `hadleSubmit`, `hadlePrev`; 변수명 `history`(실제는 navigate) | `handle*`, `navigate`로 통일 |
| 9 | `Info.jsx` | `history("/Chat")` 대문자 경로 | `/chat`으로 통일 |
| 10 | 이미지 | `./images/...` 상대 경로 → 하위 경로(`/a/b`)에서 깨짐 | `/images/...` 절대 경로 |
| 11 | `Chat.jsx` input | `focus:` 빈 클래스 | `focus:outline-none` 등으로 수정 |
| 12 | 보안 | AI API를 프론트에서 직접 호출하면 API 키 노출 | **반드시 백엔드(프록시) 경유** |
| 13 | `index.html` | `lang="en"`, 기본 description | `lang="ko"`, 서비스 설명으로 변경 |

---

## 2. myLive 목표 구조

기준 프로젝트의 **페이지 → 컴포넌트 구조, Tailwind 스타일 패턴, `messages` 데이터 포맷**을 그대로 유지하고, 빠져 있는 **상태 로직 + 백엔드 연동**을 채웁니다.

```
myLive/
├─ GUIDE.md                  # 이 문서
├─ frontend/                 # React + Vite + Tailwind
│  ├─ public/images/         # 기준 프로젝트 이미지 복사 후 교체
│  ├─ src/
│  │  ├─ main.jsx            # (CRA의 index.js)
│  │  ├─ App.jsx
│  │  ├─ index.css
│  │  ├─ api/
│  │  │  └─ chat.js          # 백엔드 호출 함수 (신규)
│  │  ├─ pages/              # Home, Info, Chat
│  │  └─ components/         # Button, AddButton, InfoInput, MessageBox, PrevButton
│  ├─ .env                   # VITE_API_URL=http://localhost:8080
│  ├─ tailwind.config.js
│  └─ package.json
└─ backend/                  # Node(Express) 등 – AI API 키 보관 & 프록시 (신규)
   ├─ .env                   # AI API 키 (절대 커밋 금지)
   └─ ...
```

> 챗봇 주제(예: 라이브 방송 도우미 등)에 맞게 `Info` 페이지의 입력 항목, 문구, 색상 이름(`chef-*` → `live-*`)을 바꾸면 됩니다.

---

## 3. 프로젝트 세팅

### 3.1 프론트엔드 생성 (Vite 권장)

```bash
npm create vite@latest frontend -- --template react
```

```bash
cd frontend && npm install react-router-dom react-icons react-spinners
```

```bash
cd frontend && npm install -D tailwindcss@3 postcss autoprefixer
```

```bash
cd frontend && npx tailwindcss init -p
```

`tailwind.config.js`의 `content`는 Vite에 맞게 수정합니다.

```js
content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
```

`theme.extend`는 기준 프로젝트의 설정을 복사한 뒤 색상 이름/값만 바꿉니다.

### 3.2 기준 프로젝트에서 가져올 것

| 가져올 파일 | 방법 |
|---|---|
| `src/components/*.jsx` | 복사 후 1.8의 개선사항 반영 |
| `src/pages/*.jsx` | 복사 후 문구/로직 수정 |
| `src/index.css` | 그대로 복사 |
| `tailwind.config.js`의 `theme.extend` | 복사 후 색상 이름 변경 |
| `public/images/*` | 복사 후 새 서비스 이미지로 교체 (`send.svg`, `arrow-prev.svg`는 재사용 가능) |
| `index.html`의 `height:100%` / `overflow:hidden` 설정 | Vite의 `index.html`에 동일하게 적용 |

### 3.3 CRA → Vite 전환 시 주의점

- 진입 파일: `src/index.js` → `src/main.jsx`, JSX가 들어간 `.js` 파일은 `.jsx`로 변경
- 환경변수: `process.env.REACT_APP_*` → `import.meta.env.VITE_*`
- Tailwind 임의값 URL: `bg-[url('../public/images/send.svg')]` → `bg-[url('/images/send.svg')]`
- 이미지: `./images/...` → `/images/...`
- `<div id="root">`에 `style="height:100%; overflow:hidden"`, `<html>`/`<body>`에 `height:100%` 유지 (모바일 풀스크린 레이아웃의 전제)

> CRA를 그대로 쓰고 싶다면 기준 프로젝트 폴더를 복사해 `node_modules`를 지우고 `npm install` 해도 동작합니다. 다만 CRA는 더 이상 유지보수되지 않으므로 새 프로젝트에는 권장하지 않습니다.

---

## 4. 핵심 기능 구현 가이드

### 4.1 Info 페이지 – 입력 목록 상태 관리

```jsx
const [ingredientList, setIngredientList] = useState([
  { id: Date.now(), label: "ingredient_0", text: "재료", value: "" },
]);

const addIngredient = () => {
  const id = Date.now();
  setIngredientList((prev) => [
    ...prev,
    { id, label: `ingredient_${id}`, text: "재료", value: "" },
  ]);
};

const updateIngredient = (id, value) => {
  setIngredientList((prev) =>
    prev.map((item) => (item.id === id ? { ...item, value } : item))
  );
};

const removeIngredient = (id) => {
  setIngredientList((prev) => prev.filter((item) => item.id !== id));
};

const handleNext = () => {
  const filled = ingredientList.filter((item) => item.value.trim());
  if (!filled.length) return alert("항목을 1개 이상 입력해주세요");
  navigate("/chat", { state: { ingredientList: filled } });
};
```

`InfoInput`은 제어 컴포넌트로 바꿉니다.

```jsx
const InfoInput = ({ content, onChange, onRemove }) => {
  const { id, label, text, value } = content;
  // input:  value={value} onChange={(e) => onChange(id, e.target.value)}
  // button: onClick={() => onRemove(id)}
};
```

### 4.2 Chat 페이지 – 대화 흐름

```
[진입] location.state의 입력값으로 첫 질문 생성
   │   isInfoLoading = true (전체 화면 MoonLoader)
   ▼
POST /api/chat  { messages }
   │
   ▼
messages에 assistant 응답 추가, isInfoLoading = false
   │
[사용자 입력 전송]
   │   messages에 user 메시지 추가, 입력창 비우기, isMessageLoading = true (PulseLoader 말풍선)
   ▼
POST /api/chat  { messages: 전체 대화 }
   │
   ▼
messages에 assistant 응답 추가, isMessageLoading = false
```

```jsx
const location = useLocation();
const [value, setValue] = useState("");
const [messages, setMessages] = useState([]);
const [isInfoLoading, setIsInfoLoading] = useState(false);
const [isMessageLoading, setIsMessageLoading] = useState(false);

const sendMessages = async (nextMessages, setLoading) => {
  setLoading(true);
  try {
    const reply = await requestChat(nextMessages); // src/api/chat.js
    setMessages([...nextMessages, { role: "assistant", content: reply }]);
  } catch (error) {
    setMessages([
      ...nextMessages,
      { role: "assistant", content: "죄송해요, 잠시 후 다시 시도해주세요." },
    ]);
  } finally {
    setLoading(false);
  }
};

// 최초 진입 시 1회
useEffect(() => {
  const list = location.state?.ingredientList ?? [];
  const firstQuestion = `다음 정보로 도와주세요: ${list.map((i) => i.value).join(", ")}`;
  sendMessages([{ role: "user", content: firstQuestion }], setIsInfoLoading);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

const handleSubmit = (event) => {
  event.preventDefault();
  const text = value.trim();
  if (!text || isMessageLoading) return;
  setValue("");
  sendMessages([...messages, { role: "user", content: text }], setIsMessageLoading);
};
```

> 첫 질문(`user` 메시지)을 화면에 보이고 싶지 않다면 `messages`와 별도로 "숨김 프롬프트"를 백엔드에서 system 프롬프트로 처리하세요.
> React 18 개발 모드의 StrictMode에서는 `useEffect`가 2번 실행됩니다. 기준 프로젝트는 StrictMode를 제거한 상태이며, 유지하려면 `useRef` 플래그로 중복 호출을 막으세요.

### 4.3 API 호출 모듈 (`src/api/chat.js`)

```js
const API_URL = import.meta.env.VITE_API_URL;

export async function requestChat(messages) {
  const res = await fetch(`${API_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.reply;
}
```

### 4.4 PrevButton

```jsx
const navigate = useNavigate();
const handlePrev = () => navigate(-1);
```

---

## 5. 백엔드(프록시) 가이드

프론트엔드에 AI API 키를 넣으면 브라우저에서 누구나 볼 수 있습니다. **키는 백엔드 `.env`에만 두고**, 프론트는 백엔드만 호출합니다.

### 5.1 API 계약 (프론트 ↔ 백엔드)

| 항목 | 내용 |
|---|---|
| Method / URL | `POST /api/chat` |
| Request body | `{ "messages": [{ "role": "user" \| "assistant", "content": "..." }] }` |
| Response 200 | `{ "reply": "assistant 응답 텍스트" }` |
| Response 4xx/5xx | `{ "error": "메시지" }` |

### 5.2 백엔드가 할 일

1. CORS 허용 (개발 시 `http://localhost:5173`)
2. 요청 `messages` 검증 (배열 여부, 길이·글자 수 제한)
3. 챗봇 역할을 정의하는 **system 프롬프트** 추가 (예: "너는 myLive의 ○○ 도우미야. 한국어로 친절하게 답해.")
4. 선택한 AI 제공사(OpenAI, Anthropic Claude 등)의 SDK로 호출 – 두 곳 모두 `role/content` 메시지 포맷을 사용하므로 프론트 코드는 바꿀 필요 없음
5. 응답 텍스트만 `{ reply }`로 반환, 에러는 로깅 후 일반화된 메시지 반환

### 5.3 기본 세팅 예시 (Express)

```bash
mkdir backend && cd backend && npm init -y && npm install express cors dotenv
```

```
backend/.env
PORT=8080
AI_API_KEY=발급받은_키
```

`.gitignore`에 `.env`, `node_modules`를 반드시 포함합니다 (기준 프로젝트의 `.gitignore` 재사용 가능).

---

## 6. 개발 체크리스트

- [ ] `frontend` Vite 프로젝트 생성, 의존성·Tailwind 설치
- [ ] 기준 프로젝트의 components / pages / index.css / tailwind theme / images 복사
- [ ] 서비스명, 문구, 색상, 이미지, `index.html`(title, `lang="ko"`) 교체
- [ ] 1.8 개선사항 반영 (오타, 경로, PrevButton, 로딩 초기값 등)
- [ ] Info 페이지 상태 관리 (추가/수정/삭제/검증) 및 Chat으로 데이터 전달
- [ ] `backend` 생성, `/api/chat` 구현, API 키 `.env` 분리
- [ ] Chat 페이지: 최초 요청, 메시지 전송, 로딩 표시, 에러 처리
- [ ] 빈 메시지/중복 전송 방지, 전송 중 버튼 비활성화
- [ ] 모바일 크기(375px)에서 레이아웃 확인
- [ ] (선택) 대화 내역 `localStorage` 저장, 스트리밍 응답, 새 대화 시작 버튼

## 7. 실행 방법

```bash
cd backend && node index.js
```

```bash
cd frontend && npm run dev
```

브라우저에서 `http://localhost:5173` 접속.
