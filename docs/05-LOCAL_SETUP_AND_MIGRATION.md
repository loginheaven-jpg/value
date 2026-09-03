# 로컬 설치·실행·데이터베이스 마이그레이션 가이드

## 1. 전제 조건

| 항목 | 권장 버전·조건 |
|---|---|
| Node.js | 22 계열 또는 프로젝트와 호환되는 최신 LTS |
| 패키지 관리자 | pnpm 10 계열 |
| 데이터베이스 | MySQL 8 또는 TiDB 호환 인스턴스 |
| Git | 최신 안정 버전 |
| 환경 변수 | `DATABASE_URL` 등 서비스별 비밀값 |

이 프로젝트는 ESM 모드(`"type": "module"`)를 사용합니다. npm이나 yarn으로 잠시 실행할 수 있더라도 lockfile 정합성을 위해 pnpm 사용을 권장합니다.

## 2. 소스 받기

```bash
git clone https://github.com/loginheaven-jpg/value.git values-card-sort
cd values-card-sort
pnpm install
```

의존성 설치 후 다음 명령으로 타입 오류가 없는지 확인합니다.

```bash
pnpm check
pnpm test
```

현재 프로젝트에 테스트 파일이 충분하지 않을 수 있습니다. `pnpm test`가 테스트 미발견으로 실패한다면, 이를 숨기기보다 최소 테스트를 추가하는 작업을 계획에 넣으십시오.

## 3. 환경 변수 설정

프로젝트 루트에 `.env` 또는 실행 환경이 요구하는 환경 파일을 만들되, 절대 Git에 추가하지 마십시오. 아래는 예시이며 실제 주소·비밀값은 각 환경의 비밀 관리 시스템에서 주입해야 합니다.

```dotenv
DATABASE_URL=mysql://USER:PASSWORD@HOST:3306/DATABASE
JWT_SECRET=replace-with-a-long-random-secret
VITE_APP_ID=your-oauth-app-id
OAUTH_SERVER_URL=https://your-oauth-server.example
VITE_OAUTH_PORTAL_URL=https://your-oauth-portal.example
OWNER_OPEN_ID=your-owner-open-id
```

`BUILT_IN_FORGE_API_KEY`, `BUILT_IN_FORGE_API_URL` 등 플랫폼 전용 변수는 Manus 환경에서 자동 주입될 수 있습니다. 로컬에서 해당 기능을 쓰지 않는다면 값을 임의로 커밋하거나 가짜 키를 코드에 넣지 마십시오.

## 4. 데이터베이스 준비

### 4.1 빈 데이터베이스 만들기

MySQL/TiDB에서 빈 데이터베이스를 만듭니다.

```sql
CREATE DATABASE values_card_sort
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

`DATABASE_URL`이 이 DB를 가리키도록 설정합니다.

### 4.2 마이그레이션 적용

```bash
pnpm db:push
```

이 명령은 Drizzle Kit로 마이그레이션을 생성하고 적용합니다. 적용 전 `drizzle/schema.ts`와 생성된 SQL을 검토하십시오. 현재 핵심 테이블은 `users`, `values_assessments`입니다.

적용 후 연결과 테이블을 확인합니다.

```sql
SHOW TABLES;
DESCRIBE values_assessments;
```

### 4.3 기존 데이터 이전

기존 운영 DB를 새 환경으로 옮길 때는 **스키마와 데이터의 이전을 분리**하십시오.

1. 대상 DB에 `pnpm db:push`로 스키마를 먼저 맞춥니다.
2. 원본 DB에서 필요한 테이블만 내보냅니다.
3. 이름·이메일·가치 데이터가 포함된 파일은 암호화된 안전한 채널로만 전달합니다.
4. 대상 DB에 가져온 뒤 레코드 수, 날짜 범위, 중복 여부를 검증합니다.
5. DB 덤프 파일은 공개 Git 저장소·공유 폴더에 올리지 않습니다.

예시 검증 SQL:

```sql
SELECT COUNT(*) AS assessment_count FROM values_assessments;
SELECT MIN(createdAt) AS first_saved_at, MAX(createdAt) AS last_saved_at
FROM values_assessments;
SELECT email, COUNT(*) AS cnt
FROM values_assessments
GROUP BY email
HAVING COUNT(*) > 1
ORDER BY cnt DESC;
```

마지막 쿼리의 중복은 재진단 결과일 수 있으므로, 임의로 삭제하지 말고 제품 정책과 저장 시점을 함께 확인하십시오.

## 5. 개발 서버·빌드

```bash
# 개발 서버
pnpm dev

# 타입 검사
pnpm check

# 프로덕션 빌드
pnpm build

# 빌드 산출물 실행
pnpm start
```

`pnpm dev`는 `server/_core/index.ts`를 감시 실행하여 Express와 Vite 개발 환경을 함께 올립니다. 서버 포트는 코드에 하드코딩하지 말고 현재 프레임워크 설정을 따르십시오.

## 6. 로컬 검증 시나리오

| 순서 | 확인 내용 |
|---:|---|
| 1 | 첫 화면에서 이름·유효 이메일을 입력할 수 있는가 |
| 2 | 72개 카드가 한 장씩 나오고 세 더미 분류·되돌리기가 작동하는가 |
| 2-1 | '네'가 12장 미만이면 보충 화면이, 24장 초과면 재분류 권유가 뜨는가 |
| 3 | 새로고침 후 24시간 이내 진행 상태가 복원되는가 |
| 4 | 5개 쌍대비교가 10회 진행되는가 |
| 5 | 최종 3개 선택 후 결과 화면으로 이동하는가 |
| 6 | DB에 이름·이메일·가치 3개가 한 번 저장되는가 |
| 7 | 이메일로 이전 결과가 조회되는가 |
| 8 | 운영자 API가 보호되는가 — `getAll`·`delete`·`deleteMany`는 `adminProcedure`이고 `/admin` 화면에 로그인 게이트가 있다(Phase 39-A). `save`·`getByEmail`은 의도적으로 public이다(§6.1 결정 대기) |
| 9 | 결과 화면 인쇄 미리보기에서 접어 둔 성찰 질문까지 모두 나오는가 (Phase 41) |

## 7. 문제 해결

| 증상 | 우선 확인할 내용 |
|---|---|
| DB 연결 실패 | `DATABASE_URL`, 네트워크 접근, DB 생성 여부, TLS 요구 조건 |
| `pnpm db:push` 실패 | Drizzle 설정, 연결 문자열, 기존 마이그레이션 이력 |
| 결과가 DB에 저장되지 않음 | 브라우저 `values-final`, `user-name`, `user-email`, 서버 로그, `values-saved-to-db` 상태 |
| 결과가 반복 저장됨 | `Result.tsx`의 effect 의존성 및 세션 플래그가 변경되지 않았는지 확인 |
| 카드가 72개가 아님 | `client/public/values.json` 길이와 브라우저 캐시 확인 |
| 관리자 화면이 노출됨 | UI 체크가 아닌 서버 권한 검증을 구현했는지 확인 |

## 8. 배포 전 점검

배포 전에는 `pnpm check`, `pnpm test`, `pnpm build`를 실행하고, 운영 DB 연결과 환경 변수가 배포 환경에서만 주입되는지 확인하십시오. 공개 배포 시에는 관리자 API 권한 보호, 개인정보 안내·동의, 로그 비식별화가 선행되어야 합니다.
