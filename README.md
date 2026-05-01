# Vibe Danmaku

모바일 세로 화면을 기준으로 만든 스팀 판타지 탄막 슈팅 프로토타입입니다. `Lyra Aer`를 조종해 `Brass Cloud Gate`와 `Burning Ruin Corridor`를 돌파하고, 웨이브와 보스 패턴을 피하면서 자동 사격과 특수 공격으로 스테이지를 클리어합니다.

## Tech Stack

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=111111)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=ffffff)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=ffffff)
![Three.js](https://img.shields.io/badge/Three.js-0.184-000000?logo=threedotjs&logoColor=ffffff)
![React Three Fiber](https://img.shields.io/badge/React%20Three%20Fiber-9-20232A?logo=react&logoColor=61DAFB)
![Zustand](https://img.shields.io/badge/Zustand-5-764ABC)
![Vitest](https://img.shields.io/badge/Vitest-4-6E9F18?logo=vitest&logoColor=ffffff)
![Testing Library](https://img.shields.io/badge/Testing%20Library-React-E33332?logo=testinglibrary&logoColor=ffffff)

## Features

- React 기반 메뉴 플로우: 타이틀, 난이도 선택, 파일럿 선택, 스테이지 인트로, 결과 화면
- React Three Fiber/Three.js 기반 3D 전투 렌더링
- 모바일 세로 화면 중심의 드래그 회피 조작
- Stage 1 `Brass Cloud Gate`, Stage 2 `Burning Ruin Corridor`
- 정찰기, 센티넬, 랜서, 스플리터, 마인 레이어, 위버 적 웨이브
- 보스/미드보스 페이즈 패턴, 자동 사격, `Beam Lance` 특수 공격
- 생성 에셋과 최적화된 런타임 에셋 파이프라인

## Getting Started

```powershell
npm install
npm run dev
```

개발 서버가 뜨면 Vite가 출력하는 로컬 주소로 접속합니다. 앱은 세로 화면 플레이를 기준으로 하므로 브라우저 모바일 뷰포트에서 확인하는 것이 좋습니다.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Vite 개발 서버를 실행합니다. |
| `npm run build` | TypeScript 검사 후 프로덕션 빌드를 생성합니다. |
| `npm run preview` | 빌드 결과를 로컬에서 미리 봅니다. |
| `npm run test` | Vitest 테스트를 한 번 실행합니다. |
| `npm run test:watch` | Vitest를 watch 모드로 실행합니다. |
| `npm run typecheck` | `tsc --noEmit`으로 타입 검사를 실행합니다. |
| `npm run assets:pack-enemies` | 적 스프라이트 아틀라스를 패킹합니다. |
| `npm run assets:optimize` | 적 아틀라스 패킹 후 런타임 에셋을 최적화합니다. |

## Debug Flags

URL 쿼리로 전투 테스트 속도를 조정할 수 있습니다.

| Query | Effect |
| --- | --- |
| `?fastStage=true` | 스테이지 타이밍을 빠르게 줄여 웨이브와 보스 흐름을 검증합니다. |
| `?invincible=true` | 플레이어 피격을 무시해 패턴과 진행을 확인합니다. |

예시:

```text
http://localhost:5173/?fastStage=true&invincible=true
```

## Project Structure

```text
src/
  app/                 React 앱 플로우, 메뉴 UI, 에셋 프리로드
  game/
    content/           캐릭터, 적, 스테이지, 보스 스케일링 데이터
    runtime/           전투 상태 업데이트와 충돌/패턴 처리
    ui/                React Three Fiber 전투 화면과 HUD
    assets.ts          런타임 에셋 URL 매핑
public/                정적 아이콘과 공개 에셋
scripts/               에셋 패킹/최적화 스크립트
docs/superpowers/      설계 문서와 실행 계획 기록
```

## Build Notes

- `vite.config.ts`는 GitHub Pages 배포 환경에서 repository 이름을 기준으로 `base` 경로를 자동 계산합니다.
- Three.js, React Three Fiber, 전투 3D vendor chunk를 분리해 빌드 청크 크기를 관리합니다.
- React Compiler preset이 Babel 플러그인으로 연결되어 있습니다.
