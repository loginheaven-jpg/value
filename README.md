# 코치의 나침반: 가치 발견 카드

72개의 가치 카드를 단계적으로 선택하고 비교하여, 사용자 자신의 **핵심 가치 3개**를 발견하도록 돕는 한국어 웹 서비스입니다. 서비스는 이름과 이메일을 입력받아 진단 결과를 데이터베이스에 저장하며, 이전 결과 조회와 운영자용 결과 관리 화면을 제공합니다.

이 저장소는 다른 대화창·개발자·개발 환경에서도 작업을 이어갈 수 있도록 소스 코드와 인수인계 문서를 함께 관리합니다. 실제 구현 상태와 다음 개발 우선순위는 [`docs/00-HANDOVER.md`](docs/00-HANDOVER.md)를 가장 먼저 확인하십시오.

## 빠른 시작

| 목적 | 명령 |
|---|---|
| 의존성 설치 | `pnpm install` |
| 개발 서버 실행 | `pnpm dev` |
| 타입 검사 | `pnpm check` |
| 테스트 실행 | `pnpm test` |
| 프로덕션 빌드 | `pnpm build` |
| 마이그레이션 생성·적용 | `pnpm db:push` |

로컬 환경 변수와 데이터베이스 설정은 [`docs/05-LOCAL_SETUP_AND_MIGRATION.md`](docs/05-LOCAL_SETUP_AND_MIGRATION.md)를 따르십시오. 실제 비밀값은 저장소에 넣지 않으며, `.env*` 파일은 Git에서 제외됩니다.

## 서비스 흐름

| 순서 | 경로 | 사용자 활동 | 결과 |
|---|---|---|---|
| 0 | `/` | 이름·이메일 입력 후 진단 시작 | 사용자 식별 정보를 브라우저에 임시 저장 |
| 1 | `/sort` | 72개 중 마음이 끌리는 20개 선택 | 20개 가치 |
| 2 | `/sort` | 20개 중 나다움을 느끼는 10개 선택 | 10개 가치 |
| 3 | `/sort` | 인생을 대표하는 5개 선택 | 5개 가치 |
| 4 | `/step4` | 5개 가치의 10개 쌍대비교 | 우선순위가 계산된 5개 가치 |
| 5 | `/step5` | 정렬 결과를 참고하여 최종 3개 선택 | `values-final` 저장 |
| 6 | `/result` | 핵심 가치·성찰 질문 확인 | 결과 자동 저장, 복사·재진단·이력 조회 |

## 문서 지도

| 문서 | 내용 | 읽는 시점 |
|---|---|---|
| [`docs/00-HANDOVER.md`](docs/00-HANDOVER.md) | 현재 구현 상태, 작업 재개 프롬프트, 주의사항 | **가장 먼저** |
| [`docs/01-ARCHITECTURE.md`](docs/01-ARCHITECTURE.md) | 시스템 구성, 화면·서버·데이터 흐름 | 구조를 파악할 때 |
| [`docs/02-PRODUCT_UX_PROCESS.md`](docs/02-PRODUCT_UX_PROCESS.md) | UX 원칙, 5단계 진단 프로세스, 화면 명세 | UI·카피를 수정할 때 |
| [`docs/03-FRONTEND_IMPLEMENTATION.md`](docs/03-FRONTEND_IMPLEMENTATION.md) | 프론트엔드 상태, 컴포넌트, 저장소 키, 디자인 토큰 | 프론트엔드를 수정할 때 |
| [`docs/04-DATA_API_SECURITY.md`](docs/04-DATA_API_SECURITY.md) | Drizzle 스키마, tRPC 계약, 보안·개인정보 유의사항 | 서버·DB를 수정할 때 |
| [`docs/05-LOCAL_SETUP_AND_MIGRATION.md`](docs/05-LOCAL_SETUP_AND_MIGRATION.md) | 설치, 환경 변수, DB 마이그레이션, 검증 | 로컬·다른 환경에 옮길 때 |
| [`docs/06-BACKLOG_AND_KNOWN_ISSUES.md`](docs/06-BACKLOG_AND_KNOWN_ISSUES.md) | 미개발 기능, 알려진 이슈, 권장 작업 순서 | 다음 작업을 고를 때 |
| [`docs/07-CHANGELOG_AND_DECISIONS.md`](docs/07-CHANGELOG_AND_DECISIONS.md) | 주요 의사결정과 변경 이력 | 변경 이유를 확인할 때 |

## 기술 구성

프런트엔드는 React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Wouter로 구성됩니다. 백엔드는 Express와 tRPC 11, Drizzle ORM, MySQL/TiDB 호환 데이터베이스를 사용합니다. 현재 Manus OAuth 기반의 기본 사용자 모델은 포함되어 있지만, 진단 시작 자체는 이름·이메일 입력만으로 가능합니다.

## 공개 저장소 운영 원칙

이 저장소는 공개 GitHub 저장소에 반영될 수 있습니다. 따라서 API 키, 데이터베이스 연결 문자열, JWT 비밀값, 사용자 데이터 내보내기, `.env` 파일을 절대 커밋하지 마십시오. 운영 DB의 실제 데이터는 스키마 및 마이그레이션 파일로만 재현하고, 데이터 추출이 필요할 때는 개인정보 비식별 절차를 별도로 수행하십시오.
