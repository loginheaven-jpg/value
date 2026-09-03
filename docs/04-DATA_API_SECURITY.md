# 데이터·API·보안 설계

## 1. 데이터 모델

현재 데이터베이스 모델은 기본 사용자 테이블과 가치 진단 결과 테이블로 구성됩니다. 정의의 원본은 `drizzle/schema.ts`, 적용 이력의 원본은 `drizzle/*.sql`입니다.

### 1.1 `users`

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | int, PK | 내부 사용자 식별자 |
| `openId` | varchar(64), unique | Manus OAuth 식별자 |
| `name` | text, nullable | OAuth 사용자 이름 |
| `email` | varchar(320), nullable | OAuth 이메일 |
| `loginMethod` | varchar(64), nullable | 로그인 방식 |
| `role` | enum(`user`, `admin`) | 서버 권한 모델에 사용할 역할 |
| `createdAt`, `updatedAt`, `lastSignedIn` | timestamp | 생성·수정·마지막 로그인 시각 |

### 1.2 `values_assessments`

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | int, PK | 진단 레코드 식별자 |
| `name` | varchar(100) | 시작 화면에서 입력한 이름 |
| `email` | varchar(320) | 이전 결과 조회 기준 이메일 |
| `value1`, `value2`, `value3` | varchar(100) | 최종 핵심 가치 한글명 |
| `customValue` | varchar(100), nullable | 과거 사용자 정의 가치 기능에서 사용 |
| `createdAt` | timestamp | 진단 결과 저장 시각 |

현재 스키마에는 이메일 단위의 유일성 제약이 없습니다. 이는 한 사람이 시점별로 여러 번 진단한 결과를 저장하도록 의도된 것으로 해석할 수 있으나, 중복 클릭·재전송에 따른 중복 레코드도 허용합니다. 제품 정책을 정한 뒤 `assessmentSessionId`, `clientRequestId`, 카드 데이터 버전 등의 보완 컬럼을 고려하십시오.

## 2. tRPC API 계약

API의 타입 원본은 `server/routers.ts`입니다. 프런트엔드는 `client/src/lib/trpc.ts`를 통해 이 계약을 사용합니다.

| 프로시저 | 유형 | 입력 | 현재 동작 | 권한 상태 |
|---|---|---|---|---|
| `auth.me` | query | 없음 | 현재 OAuth 사용자 반환 | public |
| `auth.logout` | mutation | 없음 | 세션 쿠키 삭제 | public |
| `values.save` | mutation | 이름, 이메일, 가치 3개, 선택적 customValue | 결과 레코드 생성 | **public** — 비로그인 참여자 흐름의 전제. §6.1 결정 대상 |
| `values.getAll` | query | 없음 | 전체 결과 최신순 반환 | **admin** (Phase 39-A) |
| `values.getByEmail` | query | 이메일 | 이메일 기준 결과 반환. **이메일 컬럼은 되돌려 주지 않음** | **public** — 소유권 검증은 §6.1 결정 대상 |
| `values.delete` | mutation | id | 단일 결과 삭제 | **admin** (Phase 39-A) |
| `values.deleteMany` | mutation | id 배열 | 다중 결과 삭제 | **admin** (Phase 39-A) |

## 3. API 입력 검증

`values.save`는 Zod를 이용해 이름이 비어 있지 않은지, 이메일 형식이 맞는지, 가치 3개가 문자열인지 검증합니다. 그러나 현재 가치 문자열이 실제 72개 카드에 속하는지, 문자열 길이가 제한을 넘지 않는지, 요청자가 해당 이메일의 결과를 읽을 권한이 있는지는 검증하지 않습니다.

서버 수준의 검증을 강화할 때 다음 정책을 고려하십시오.

| 검증 대상 | 권장 정책 |
|---|---|
| 가치명 | 정식 카드 목록과 대조하거나 명시적인 사용자 정의 가치 정책 적용 |
| 문자열 길이 | DB 컬럼 길이와 동일하거나 더 엄격한 최대 길이 설정 |
| 요청 빈도 | 저장·이메일 조회·삭제에 IP/세션/사용자 기반 rate limit 적용 |
| 이력 조회 | 로그인 사용자 id와 결과 소유자 연결 또는 이메일 인증 링크 도입 |
| 삭제 | `adminProcedure`로 제한하고 감사 로그 남김 |

## 4. 가장 중요한 보안 보완 작업

### 4.1 관리자 권한을 서버에서 강제

현재 `Admin.tsx`는 브라우저에 저장된 이메일이 `viproject@naver.com`과 같은지를 확인하는 방식의 UI 제어를 사용합니다. 이는 주소창 이동·API 직접 호출을 막지 못합니다.

권장 구현은 다음과 같습니다.

1. OAuth 로그인 사용자를 `users` 테이블에 upsert한다.
2. 운영자 계정의 `role`을 `admin`으로 설정한다.
3. `server/_core/trpc.ts`의 `protectedProcedure`를 기반으로 `adminProcedure`를 만든다.
4. `values.getAll`, `values.delete`, `values.deleteMany`에 `adminProcedure`를 적용한다.
5. 프런트엔드에서는 `auth.me`의 역할 정보를 바탕으로 링크만 조건부 렌더링한다. **링크 숨김은 보조 UX일 뿐 권한 통제가 아니다.**

### 4.2 결과 소유권 보호

현재 `values.getByEmail`은 입력 이메일만 알면 결과를 반환합니다. 개인정보를 보유하는 서비스라면 다음 중 하나를 선택해야 합니다.

| 모델 | 장점 | 고려사항 |
|---|---|---|
| OAuth 로그인 필수 | 명확한 사용자 식별 | 초기 진입 마찰 증가 |
| 이메일 일회용 링크 | 로그인 부담 감소 | 메일 발송·토큰 만료·재사용 방지 구현 필요 |
| 결과 코드를 별도 발급 | 간단한 공유 가능 | 코드 유출·분실 대응 필요 |

### 4.3 개인정보와 로그

이름·이메일·핵심 가치는 개인의 성찰 정보로 취급해야 합니다. 개발·운영 로그에 이름, 이메일, 가치 3개를 그대로 출력하지 않도록 `Result.tsx`, `server/routers.ts`의 디버그 로그를 제거하거나 비식별화하십시오. 공개 GitHub 저장소에 DB 덤프나 실사용자 화면 캡처를 넣지 마십시오.

## 5. 환경 변수

현재 서버가 필요로 하는 대표 환경 변수는 아래와 같습니다. 실제 값은 플랫폼의 비밀 관리 기능 또는 로컬 `.env`에만 보관합니다.

| 변수 | 용도 | 공개 저장소 처리 |
|---|---|---|
| `DATABASE_URL` | MySQL/TiDB 연결 문자열 | 절대 커밋 금지 |
| `JWT_SECRET` | 세션 서명 | 절대 커밋 금지 |
| `VITE_APP_ID` | OAuth 앱 식별자 | 플랫폼 설정으로 관리 |
| `OAUTH_SERVER_URL` | OAuth 서버 주소 | 환경별 설정 |
| `VITE_OAUTH_PORTAL_URL` | 로그인 포털 주소 | 환경별 설정 |
| `OWNER_OPEN_ID` | 기본 운영자 식별 지원 | 비밀에 준해 관리 |
| `BUILT_IN_FORGE_API_*` | 플랫폼 내장 서비스 접근 | 절대 커밋 금지 |

## 6. 데이터 마이그레이션 원칙

1. `drizzle/schema.ts`를 먼저 수정합니다.
2. `pnpm db:push`로 새 마이그레이션을 생성·적용합니다.
3. `drizzle/*.sql`을 커밋합니다.
4. 기존 데이터 영향을 확인하는 SQL을 별도로 실행합니다.
5. 새·기존 레코드가 공존하는 전환 기간에는 nullable 컬럼 또는 버전 컬럼을 활용합니다.

운영 DB에서 삭제·대량 수정·스키마 축소를 실행하기 전에는 백업과 영향 범위 검토가 필요합니다. 실제 사용자 데이터는 이 공개 저장소로 내보내지 않습니다.

## 7. 향후 이메일 연동 설계 메모

결과 이메일 발송이나 비밀번호 재설정을 도입한다면 이메일 발송 모듈, 발신 도메인 인증, 동의 문구, 구독 해지·재발송 정책, 재설정 토큰 보관·만료·1회 사용 정책을 별도 설계해야 합니다. 이 저장소에는 메일 공급자의 API 키나 SMTP 비밀값을 넣지 않습니다.
