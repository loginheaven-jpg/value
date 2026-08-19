# 시스템 아키텍처

## 1. 구성 개요

이 서비스는 브라우저에서 카드 선택 과정을 수행하고, 최종 결과만 tRPC를 통해 서버로 전달해 MySQL/TiDB 호환 데이터베이스에 기록하는 단일 웹 애플리케이션입니다. 실시간 협업이나 별도의 배치 작업은 현재 사용하지 않습니다.

```text
사용자 브라우저
  ├─ React / TypeScript / Wouter
  │    ├─ localStorage: 프로필·진단 진행 상태·최종 선택
  │    └─ sessionStorage: 결과 DB 저장 중복 방지
  │
  └─ /api/trpc (React Query + tRPC client)
       │
Express 서버 + tRPC Router
  ├─ values.save / getAll / getByEmail / delete / deleteMany
  └─ auth.me / logout
       │
Drizzle ORM
       │
MySQL 또는 TiDB 호환 데이터베이스
  ├─ users
  └─ values_assessments
```

## 2. 디렉터리와 책임

| 위치 | 책임 | 수정 시 유의사항 |
|---|---|---|
| `client/src/pages/` | 화면 단위 사용자 여정 | 경로·상태 키·다음 페이지 의존성을 함께 점검 |
| `client/src/components/` | 카드·진행률 등 재사용 UI | shadcn/ui 래퍼와 서비스 전용 컴포넌트가 함께 존재 |
| `client/src/types/values.ts` | `Value`, 단계 설정 타입·문구 | 단계 수와 `Sort.tsx`의 실제 라우팅은 완전히 일치하지 않으므로 변경 전 확인 |
| `client/public/values.json` | 정식 72개 가치 카드 데이터 | id는 안정적으로 유지. 추가·삭제 시 결과·성찰 질문·단계 안내를 함께 검토 |
| `server/routers.ts` | tRPC API 계약 | 현재 `values` 라우터는 publicProcedure. 권한 설계 변경 시 여기부터 수정 |
| `server/db.ts` | Drizzle 기반 조회·저장·삭제 함수 | DB 연결 불가 시의 오류 처리와 호출부 UX를 함께 검토 |
| `drizzle/schema.ts` | 현재 데이터 모델 | 변경 시 마이그레이션 생성·적용 및 타입 검사를 필수 수행 |
| `drizzle/*.sql` | DB 스키마 변경 이력 | 생성 후 수정하지 말고 새 마이그레이션을 추가 |
| `server/_core/` | 프레임워크 기반 인증·tRPC·Express 부트스트랩 | 특별한 인프라 변경이 아니면 직접 수정하지 않음 |
| `docs/` | 인수인계·설계 기준 | 기능 변경 시 관련 문서를 같은 커밋에서 갱신 |

## 3. 화면·라우팅 구조

| 경로 | 페이지 | 역할 | 진입 조건 |
|---|---|---|---|
| `/` | `Intro.tsx` | 서비스 소개, 이름·이메일 입력 | 기본 진입점 |
| `/sort` | `Sort.tsx` | 1~3단계 카드 선택 | `user-name`, `user-email` 입력 후 권장 |
| `/step4` | `PairwiseComparison.tsx` | 5개 카드의 10개 1:1 비교 | `values-step3` 필요 |
| `/step5` | `FinalSelection.tsx` | 정렬된 5개 중 최종 3개 선택 | `pairwise-results` 필요 |
| `/result` | `Result.tsx` | 결과, 성찰 질문, DB 자동 저장 | `values-final` 필요 |
| `/my-results` | `MyResults.tsx` | 이메일 기준 과거 결과 조회 | `user-email` 필요 |
| `/admin` | `Admin.tsx` | 전체 결과 조회·삭제 | 현재는 UI 수준 제어만 있음 |

경로 정의의 원본은 `client/src/App.tsx`입니다. 새 화면을 추가할 때는 단순히 페이지를 만들지 말고, 진입 경로·뒤로 가기·브라우저 저장소 정리·404 처리를 함께 설계하십시오.

## 4. 핵심 데이터 흐름

### 4.1 카드 데이터 로드

`Sort.tsx`가 `/values.json`을 fetch하고 `Value[]`로 관리합니다. 한 카드의 데이터 구조는 아래와 같습니다.

```ts
interface Value {
  id: number;
  korean: string;
  english: string;
  description: string;
  category: string;
}
```

정식 데이터는 id 1~72입니다. 데이터 id를 재번호화하면 저장된 진행 상태와 성찰 질문, 과거 브라우저 데이터의 참조가 깨질 수 있으므로 기존 id는 유지해야 합니다.

### 4.2 진단 진행 상태

1~3단계에서 `Sort.tsx`는 현재 단계·선택 id·현재 후보 id·이전 단계 이력을 `values-progress`에 저장합니다. 24시간이 지난 진행 상태는 복원하지 않고 삭제합니다. 3단계가 완료되면 선택한 5개 객체를 `values-step3`에 저장하고 `values-progress`를 제거한 뒤 `/step4`로 이동합니다.

쌍대비교 화면은 진행 중인 비교 인덱스와 승리 수를 `pairwise-progress`에 저장하고, 비교 종료 시 정렬된 카드 목록을 `pairwise-results`에 저장합니다. 최종 선택 화면은 최종 3개 객체를 `values-final`에 저장하고 `/result`로 이동합니다.

### 4.3 결과 저장

`Result.tsx`는 `values-final`에서 3개 카드를 읽고, `user-name`·`user-email`과 함께 `trpc.values.save`를 호출합니다. 세션 내 동일 결과의 중복 저장을 줄이기 위해 `values-saved-to-db`를 호출 직전에 설정하고 오류 발생 시 제거합니다.

DB에는 한 번의 결과가 한 레코드로 들어가며, 카드 객체 전체가 아니라 한글 가치명 3개와 선택적 `customValue`만 저장합니다. 카드 설명이나 비교 이력은 현재 DB에 저장하지 않습니다.

## 5. 서버 레이어

서버는 Express 위에서 tRPC를 제공합니다. `server/routers.ts`의 `values` 라우터가 진단 결과 API를 소유하며, `server/db.ts`는 Drizzle 호출을 캡슐화합니다.

| 계층 | 파일 | 역할 |
|---|---|---|
| 입력 검증·계약 | `server/routers.ts` | Zod로 API 입력을 검증하고 tRPC 프로시저를 노출 |
| 영속화 | `server/db.ts` | DB 연결, 저장·조회·삭제 수행 |
| 데이터 정의 | `drizzle/schema.ts` | 테이블·컬럼·TypeScript 추론 타입 정의 |
| 인프라 | `server/_core/*` | OAuth, 쿠키, 컨텍스트, tRPC, Express·Vite 통합 |

## 6. 인증·권한의 현재 경계

`users` 테이블과 Manus OAuth 기반 기본 인증은 프레임워크에 포함되어 있습니다. 반면 가치 진단의 `values.save`, `getAll`, `getByEmail`, `delete`, `deleteMany`는 현재 모두 `publicProcedure`입니다. 화면에서 `viproject@naver.com` 여부를 읽어 관리자 링크를 보이게 하지만, 이는 서버 권한 검증이 아닙니다.

따라서 현재 구조에서는 `/admin` 또는 tRPC 엔드포인트에 직접 접근할 경우 데이터가 노출·변경될 위험이 있습니다. 운영 배포 전에는 반드시 `protectedProcedure`·`adminProcedure` 수준의 서버 권한 검증으로 변경해야 합니다. 자세한 개선안은 [`04-DATA_API_SECURITY.md`](04-DATA_API_SECURITY.md)에 기록되어 있습니다.

## 7. 외부 연동 현황

| 연동 | 현재 상태 | 비고 |
|---|---|---|
| Manus OAuth | 프레임워크 제공 | 사용자는 기본 인증 모델로만 활용 가능 |
| MySQL/TiDB | 사용 중 | `DATABASE_URL` 필요 |
| S3 저장소 | 프레임워크 제공, 현재 핵심 흐름 미사용 | 향후 PDF·리포트 보관 시 사용 가능 |
| 이메일 | 미구현 | 결과 발송·비밀번호 재설정과 별개로 설계 필요 |
| PDF | 라이브러리 의존성 존재, UI 비노출 | 재도입 전 한글 폰트·개인정보 포함 범위 검토 필요 |
