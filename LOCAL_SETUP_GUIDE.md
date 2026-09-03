# 로컬 환경 설정 가이드

> **이 문서는 v1 기준입니다.** 현재 설치·마이그레이션 절차는
> `docs/05-LOCAL_SETUP_AND_MIGRATION.md`가 정본입니다. 이 문서는 당시 기록으로 남겨 둡니다.

**코치의 나침반: 가치 발견 카드** 프로젝트를 로컬 환경에서 실행하기 위한 완전한 설정 가이드입니다.

## 목차

1. [시스템 요구사항](#시스템-요구사항)
2. [프로젝트 다운로드](#프로젝트-다운로드)
3. [데이터베이스 설정](#데이터베이스-설정)
4. [환경 변수 설정](#환경-변수-설정)
5. [의존성 설치 및 실행](#의존성-설치-및-실행)
6. [문제 해결](#문제-해결)

---

## 시스템 요구사항

로컬 환경에서 프로젝트를 실행하기 위해서는 다음 소프트웨어가 설치되어 있어야 합니다.

| 소프트웨어 | 최소 버전 | 권장 버전 | 다운로드 링크 |
|-----------|----------|----------|--------------|
| **Node.js** | 18.0.0 | 22.13.0 | [nodejs.org](https://nodejs.org/) |
| **pnpm** | 8.0.0 | 최신 버전 | `npm install -g pnpm` |
| **PostgreSQL** | 14.0 | 15.0 이상 | [postgresql.org](https://www.postgresql.org/) |
| **Git** | 2.30.0 | 최신 버전 | [git-scm.com](https://git-scm.com/) |

### Node.js 설치 확인

터미널에서 다음 명령어를 실행하여 Node.js와 npm이 설치되어 있는지 확인합니다.

```bash
node --version  # v22.13.0 이상
npm --version   # 9.0.0 이상
```

### pnpm 설치

```bash
npm install -g pnpm
pnpm --version  # 8.0.0 이상
```

---

## 프로젝트 다운로드

### 방법 1: Manus 관리 UI에서 다운로드

1. Manus 웹 인터페이스에서 프로젝트 페이지로 이동합니다.
2. 우측 상단의 **Code** 탭을 클릭합니다.
3. **Download All Files** 버튼을 클릭하여 ZIP 파일을 다운로드합니다.
4. ZIP 파일을 원하는 위치에 압축 해제합니다.

```bash
# 다운로드한 파일 압축 해제
unzip values-card-sort.zip
cd values-card-sort
```

### 방법 2: Git Clone (권장)

Manus에서 Git 저장소 URL을 제공하는 경우, 다음과 같이 클론할 수 있습니다.

```bash
git clone <저장소-URL>
cd values-card-sort
```

---

## 데이터베이스 설정

이 프로젝트는 PostgreSQL 데이터베이스를 사용합니다. 로컬 환경에서 PostgreSQL을 설정하는 방법을 안내합니다.

### PostgreSQL 설치

#### macOS (Homebrew 사용)

```bash
brew install postgresql@15
brew services start postgresql@15
```

#### Ubuntu/Debian

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### Windows

[PostgreSQL 공식 사이트](https://www.postgresql.org/download/windows/)에서 설치 프로그램을 다운로드하여 설치합니다.

### 데이터베이스 생성

PostgreSQL에 접속하여 프로젝트용 데이터베이스를 생성합니다.

```bash
# PostgreSQL 접속 (기본 사용자: postgres)
psql -U postgres

# 데이터베이스 생성
CREATE DATABASE values_card_sort;

# 사용자 생성 (선택사항)
CREATE USER values_user WITH PASSWORD 'your_secure_password';

# 권한 부여
GRANT ALL PRIVILEGES ON DATABASE values_card_sort TO values_user;

# 종료
\q
```

### 데이터베이스 연결 확인

```bash
psql -U postgres -d values_card_sort -c "SELECT version();"
```

정상적으로 PostgreSQL 버전이 출력되면 데이터베이스가 준비된 것입니다.

---

## 환경 변수 설정

프로젝트 루트 디렉토리에 `.env` 파일을 생성하고 다음 환경 변수를 설정합니다.

### .env 파일 생성

```bash
# 프로젝트 루트에서 실행
touch .env
```

### 환경 변수 설정

`.env` 파일을 텍스트 에디터로 열고 다음 내용을 입력합니다.

```env
# 데이터베이스 연결 정보
DATABASE_URL="postgresql://postgres:your_secure_password@localhost:5432/values_card_sort"

# JWT 시크릿 (랜덤 문자열 생성 권장)
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# 프론트엔드 설정
VITE_APP_TITLE="코치의 나침반: 가치 발견 카드"
VITE_APP_LOGO="/logo.svg"

# OAuth 설정 (Manus 내장 기능 - 로컬에서는 비활성화)
OAUTH_SERVER_URL=""
VITE_OAUTH_PORTAL_URL=""

# Forge API (Manus 내장 기능 - 로컬에서는 비활성화)
BUILT_IN_FORGE_API_KEY=""
BUILT_IN_FORGE_API_URL=""
VITE_FRONTEND_FORGE_API_KEY=""
VITE_FRONTEND_FORGE_API_URL=""

# 소유자 정보 (선택사항)
OWNER_NAME="Your Name"
OWNER_OPEN_ID=""

# 분석 도구 (선택사항)
VITE_ANALYTICS_ENDPOINT=""
VITE_ANALYTICS_WEBSITE_ID=""
VITE_APP_ID=""
```

### 환경 변수 설명

| 변수명 | 설명 | 필수 여부 |
|--------|------|-----------|
| `DATABASE_URL` | PostgreSQL 연결 문자열 | **필수** |
| `JWT_SECRET` | JWT 토큰 암호화 키 (최소 32자 권장) | **필수** |
| `VITE_APP_TITLE` | 애플리케이션 제목 | 선택 |
| `VITE_APP_LOGO` | 로고 이미지 경로 | 선택 |
| `OAUTH_SERVER_URL` | OAuth 서버 URL (Manus 전용) | 선택 |
| `BUILT_IN_FORGE_API_KEY` | Forge API 키 (Manus 전용) | 선택 |

### JWT_SECRET 생성 방법

안전한 JWT 시크릿을 생성하려면 다음 명령어를 사용합니다.

```bash
# Node.js 사용
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# OpenSSL 사용
openssl rand -hex 32
```

---

## 의존성 설치 및 실행

### 1. 의존성 설치

프로젝트 루트 디렉토리에서 다음 명령어를 실행합니다.

```bash
pnpm install
```

### 2. 데이터베이스 마이그레이션

Drizzle ORM을 사용하여 데이터베이스 스키마를 생성합니다.

```bash
# 마이그레이션 파일 생성
pnpm db:generate

# 데이터베이스에 스키마 적용
pnpm db:push
```

### 3. 개발 서버 실행

```bash
pnpm dev
```

성공적으로 실행되면 다음과 같은 메시지가 출력됩니다.

```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: http://192.168.x.x:3000/
```

브라우저에서 `http://localhost:3000`을 열어 애플리케이션을 확인합니다.

### 4. 프로덕션 빌드

```bash
# 빌드
pnpm build

# 프로덕션 서버 실행
pnpm start
```

---

## 문제 해결

### 문제 1: `DATABASE_URL` 연결 실패

**증상:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**해결 방법:**

1. PostgreSQL이 실행 중인지 확인합니다.
   ```bash
   # macOS
   brew services list | grep postgresql
   
   # Linux
   sudo systemctl status postgresql
   ```

2. `.env` 파일의 `DATABASE_URL`이 올바른지 확인합니다.
   - 호스트: `localhost` 또는 `127.0.0.1`
   - 포트: `5432` (기본값)
   - 사용자명과 비밀번호가 정확한지 확인

3. PostgreSQL 접속 테스트:
   ```bash
   psql -U postgres -d values_card_sort
   ```

### 문제 2: `pnpm install` 실패

**증상:**
```
ERR_PNPM_PEER_DEP_ISSUES  Unmet peer dependencies
```

**해결 방법:**

1. Node.js 버전을 확인합니다 (18.0.0 이상 필요).
   ```bash
   node --version
   ```

2. pnpm 캐시를 삭제하고 재설치합니다.
   ```bash
   pnpm store prune
   pnpm install --force
   ```

### 문제 3: 포트 3000이 이미 사용 중

**증상:**
```
Port 3000 is already in use
```

**해결 방법:**

1. 다른 포트를 사용합니다.
   ```bash
   PORT=3001 pnpm dev
   ```

2. 또는 기존 프로세스를 종료합니다.
   ```bash
   # macOS/Linux
   lsof -ti:3000 | xargs kill -9
   
   # Windows
   netstat -ano | findstr :3000
   taskkill /PID <PID번호> /F
   ```

### 문제 4: 데이터베이스 마이그레이션 실패

**증상:**
```
Error: relation "values_assessments" does not exist
```

**해결 방법:**

1. 마이그레이션을 다시 실행합니다.
   ```bash
   pnpm db:push
   ```

2. 데이터베이스를 초기화하고 재생성합니다.
   ```bash
   psql -U postgres -c "DROP DATABASE values_card_sort;"
   psql -U postgres -c "CREATE DATABASE values_card_sort;"
   pnpm db:push
   ```

### 문제 5: TypeScript 에러

**증상:**
```
error TS2739: Type 'QueryClient' is missing the following properties
```

**해결 방법:**

1. `node_modules`를 삭제하고 재설치합니다.
   ```bash
   rm -rf node_modules pnpm-lock.yaml
   pnpm install
   ```

2. TypeScript 버전을 확인합니다.
   ```bash
   pnpm list typescript
   ```

---

## 데이터베이스 스키마

프로젝트에서 사용하는 데이터베이스 테이블 구조는 다음과 같습니다.

### `values_assessments` 테이블

| 컬럼명 | 타입 | 설명 | 제약 조건 |
|--------|------|------|-----------|
| `id` | INTEGER | 고유 ID | PRIMARY KEY, AUTO_INCREMENT |
| `name` | VARCHAR(255) | 참가자 이름 | NOT NULL |
| `email` | VARCHAR(255) | 참가자 이메일 | NOT NULL |
| `value1` | VARCHAR(100) | 첫 번째 가치 | NOT NULL |
| `value2` | VARCHAR(100) | 두 번째 가치 | NOT NULL |
| `value3` | VARCHAR(100) | 세 번째 가치 | NOT NULL |
| `created_at` | TIMESTAMP | 생성 일시 | DEFAULT NOW() |

### 스키마 확인

데이터베이스에 접속하여 테이블 구조를 확인할 수 있습니다.

```bash
psql -U postgres -d values_card_sort

# 테이블 목록 확인
\dt

# 테이블 구조 확인
\d values_assessments

# 데이터 확인
SELECT * FROM values_assessments ORDER BY created_at DESC LIMIT 10;
```

---

## 추가 리소스

### 프로젝트 구조

```
values-card-sort/
├── client/                 # 프론트엔드 (React + Vite)
│   ├── public/            # 정적 파일 (이미지, 폰트 등)
│   └── src/
│       ├── pages/         # 페이지 컴포넌트
│       ├── components/    # 재사용 가능한 컴포넌트
│       ├── lib/           # 유틸리티 함수
│       └── types/         # TypeScript 타입 정의
├── server/                # 백엔드 (Express + tRPC)
│   ├── routers.ts         # API 라우터
│   └── db.ts              # 데이터베이스 함수
├── drizzle/               # 데이터베이스 스키마
│   └── schema.ts          # Drizzle ORM 스키마
├── shared/                # 공유 타입 및 상수
│   └── const.ts           # 공통 상수
├── .env                   # 환경 변수 (로컬 생성 필요)
├── package.json           # 의존성 목록
└── vite.config.ts         # Vite 설정
```

### 주요 명령어

| 명령어 | 설명 |
|--------|------|
| `pnpm dev` | 개발 서버 실행 (Hot Reload) |
| `pnpm build` | 프로덕션 빌드 |
| `pnpm start` | 프로덕션 서버 실행 |
| `pnpm db:generate` | 마이그레이션 파일 생성 |
| `pnpm db:push` | 데이터베이스 스키마 적용 |
| `pnpm lint` | ESLint 실행 |
| `pnpm type-check` | TypeScript 타입 체크 |

### 기술 스택

- **프론트엔드**: React 19, Vite, Tailwind CSS 4, shadcn/ui, Wouter
- **백엔드**: Express, tRPC, Drizzle ORM
- **데이터베이스**: PostgreSQL
- **인증**: JWT (JSON Web Token)
- **배포**: Manus Platform (또는 Vercel, Netlify 등)

---

## 로컬 개발 워크플로우

### 1. 새로운 기능 개발

```bash
# 1. 새 브랜치 생성
git checkout -b feature/new-feature

# 2. 코드 수정

# 3. 개발 서버에서 테스트
pnpm dev

# 4. 빌드 테스트
pnpm build

# 5. 커밋 및 푸시
git add .
git commit -m "Add new feature"
git push origin feature/new-feature
```

### 2. 데이터베이스 스키마 변경

```bash
# 1. drizzle/schema.ts 파일 수정

# 2. 마이그레이션 생성
pnpm db:generate

# 3. 데이터베이스에 적용
pnpm db:push

# 4. 변경 사항 확인
psql -U postgres -d values_card_sort -c "\d values_assessments"
```

### 3. 디버깅

브라우저 개발자 도구를 열어 콘솔 로그를 확인합니다.

```javascript
// client/src/pages/Result.tsx에 디버깅 로그 추가
console.log('[DEBUG] localStorage:', localStorage.getItem('values-final'));
console.log('[DEBUG] API response:', response);
```

서버 로그는 터미널에서 확인할 수 있습니다.

```bash
# 개발 서버 실행 시 자동으로 로그 출력
pnpm dev
```

---

## 배포 가이드

### Manus Platform에 배포

1. Manus 웹 인터페이스에서 **Publish** 버튼을 클릭합니다.
2. 자동으로 빌드 및 배포가 진행됩니다.
3. 배포 완료 후 공개 URL이 제공됩니다.

### Vercel에 배포

```bash
# Vercel CLI 설치
npm install -g vercel

# 배포
vercel

# 환경 변수 설정
vercel env add DATABASE_URL
vercel env add JWT_SECRET
```

### Docker로 배포

```dockerfile
# Dockerfile 예시
FROM node:22-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY . .

RUN pnpm build

EXPOSE 3000

CMD ["pnpm", "start"]
```

```bash
# Docker 이미지 빌드
docker build -t values-card-sort .

# 컨테이너 실행
docker run -p 3000:3000 --env-file .env values-card-sort
```

---

## 지원 및 문의

문제가 발생하거나 추가 도움이 필요한 경우:

- **Manus 지원**: [https://help.manus.im](https://help.manus.im)
- **프로젝트 이슈**: GitHub Issues (저장소가 있는 경우)
- **이메일**: viproject@naver.com (프로젝트 관리자)

---

**작성자**: Manus AI  
**최종 수정일**: 2025년 11월 13일  
**버전**: 1.0.0
