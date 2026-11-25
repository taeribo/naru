# NARU 개발 기준

## 저장소 구조

- `frontend/src/app/`은 페이지 구성과 공통 스타일을 담당합니다.
- `frontend/src/scenes/`은 3D 장면, 조명, 카메라 조작을 담당합니다.
- `frontend/public/models/`은 팀이 추가하는 GLB 파일을 제공합니다.
- `backend/src/main/java/kr/naru/`의 `api`는 HTTP 요청과 응답을 처리하고, `config`는 애플리케이션 설정을 관리합니다.
- `.github/`에는 팀 PR 템플릿을 둡니다.

공용 UI, 기능, 훅, 서비스 디렉터리는 해당 코드가 생길 때 추가합니다.

## 팀 개발

- 작업 브랜치에서 기능별로 변경하고 PR에 검증 명령과 실행 결과를 남깁니다. `main` 대상 PR과 `main` 업데이트에서는 GitHub Actions가 프론트 설치·빌드·린트·포맷 검사와 백엔드 Gradle 테스트·빌드를 수행합니다.
- 프론트엔드는 TypeScript strict 모드와 함수형 컴포넌트를 사용합니다. 컴포넌트는 PascalCase, 변수와 함수는 camelCase, 고정 상수는 UPPER_SNAKE_CASE를 사용합니다. 포맷은 `npm run format`으로 맞춥니다.
- 팀원은 `npm ci`로 `frontend/package-lock.json`에 고정된 의존성 트리를 설치합니다. 의존성을 변경할 때는 `package.json`과 잠금 파일을 함께 커밋합니다.
- 비밀값은 IntelliJ 실행 구성 또는 셸 환경변수로 주입합니다. 브라우저에 노출되는 `VITE_*` 변수에는 공개 값만 넣습니다.
- 현재 Health API는 로그인과 DB 연결 없이 사용할 수 있습니다. MySQL 개발 연결은 선택형으로 구성합니다. 풍등 목록 알림은 Spring WebSocket을 사용합니다. 공간별 실시간 통신은 후속 단계입니다.

## 서비스 범위

초기 목표는 동일한 맵을 사용하는 독립 공간 2개를 운영하고, 공간당 최대 30명이 참여하는 것입니다. 확장 목표는 공간 10개와 동시 접속 300명입니다. 체험은 풍등과 운세 8종이며 무료 이용과 선택형 자율 후원을 계획합니다.

## 소원 목록

`GET /api/wishes/page?author=<브라우저 작성자 키>`는 다른 방문자의 공개 소원을 최신순 30건까지 반환합니다. 응답의 `items`가 목록이고, 이전 소원이 더 있으면 `nextCursor`가 문자열로 주어집니다. 다음 요청에는 같은 `author`와 `cursor=<nextCursor>`를 보냅니다. 마지막 페이지의 커서는 `null`이며, 유효하지 않은 커서는 HTTP 400을 반환합니다. `GET /api/wishes`는 기존 배열 응답을 유지합니다.

최신 목록은 같은 출처의 `/api/wishes/ws`에 연결합니다. 새 소원이 등록되면 서버가 본문이나 작성자 정보 없이 `wish-created` 신호를 보내고, 브라우저가 기존 REST 페이지를 다시 조회합니다. 연결이 끊기면 재연결을 시도하며 연결 전에만 8초 간격으로 조회합니다. 재연결 직후 최신 페이지를 받아 끊긴 동안의 소원을 확인합니다. REST 조회가 일시 실패하면 8초 후 다시 시도합니다.

‘더 보기’를 누르면 실시간 구독을 잠시 중지하고 읽던 목록에 이전 항목을 추가합니다. ‘최신 소원’을 누르거나 팝업을 다시 열면 최신 페이지 조회와 구독을 재개합니다. 정적 빌드를 제공하는 환경에서는 같은 출처의 `/api`를 Spring Boot에 전달하고 `/api/wishes/ws`의 WebSocket 업그레이드를 허용합니다.

## Docker 개발 환경

`compose.yaml`은 Vite와 Spring Boot를 실행합니다. Vite는 컨테이너 내부에서 `http://backend:8080`으로 API를 전달합니다. 프론트엔드 소스 수정은 Vite가 반영합니다. npm 의존성, Vite 설정, Java 코드를 변경한 뒤에는 `docker compose up --build -d --wait`로 반영합니다.

### 휴대폰에서 열기

Git 루트에서 `cp .env.example .env`로 로컬 설정을 준비하고, 휴대폰과 개발 PC를 같은 Wi‑Fi에 연결합니다. `.env`의 `FRONTEND_BIND_ADDRESS`를 `0.0.0.0`으로 바꾸고 `docker compose up -d --wait`를 실행합니다. 휴대폰에서 `http://<개발-PC의-LAN-IP>:5173`을 엽니다. 호스트 포트를 바꿨다면 해당 포트를 사용합니다.

### MySQL을 함께 실행하기

루트 `.env`에 `DB_PASSWORD`와 `MYSQL_ROOT_PASSWORD`를 각각 설정한 뒤 실행합니다.

```sh
docker compose -f compose.yaml -f compose.mysql.yaml up --build -d --wait
docker compose -f compose.yaml -f compose.mysql.yaml ps
```

MySQL은 사용자 계정으로 `SELECT 1`을 실행할 수 있을 때 준비 상태가 됩니다. 백엔드는 그 이후 시작하며, `mysql` Spring 프로필에서 JDBC로 `SELECT 1`을 실행합니다. 성공하면 백엔드 로그에 `MySQL JDBC connection verified`가 표시됩니다. DB는 Compose 내부 네트워크에서 접근하고 데이터는 `mysql-data` 볼륨에 저장합니다. MySQL 이미지는 새 데이터 볼륨을 처음 초기화할 때 계정과 비밀번호를 적용합니다. MySQL 연결만 켠 경우 소원 API는 기본 메모리 저장소를 사용합니다. 영속 저장은 다음 절의 별도 프로필로 켭니다.

중지할 때 구성 파일을 동일하게 지정합니다.

```sh
docker compose -f compose.yaml -f compose.mysql.yaml down
```


## 풍등 소원 MySQL 저장

기본 Compose와 `mysql` 프로필은 기존 개발 환경처럼 메모리 소원 저장소를 사용합니다. MySQL에 소원을 저장하려면 적용이 승인된 빈 개발 DB에 [초기 스키마](../backend/db/migrations/V001__lantern_persistence.sql)를 한 번 적용한 뒤, 루트 `.env`에서 `NARU_MYSQL_PROFILES=mysql,wish-persistence`로 설정하고 MySQL Compose를 실행합니다. 애플리케이션은 SQL을 자동 실행하지 않습니다.

```sh
docker compose -f compose.yaml -f compose.mysql.yaml up --build -d --wait
```

서버는 멀티플레이어 공간 배정 전까지 기본 1번 공간을 사용합니다. 목록은 전체 공개 소원 중 본인의 글을 제외하고, 페이지당 최대 30건을 반환합니다. 화면과 API 모두 유니코드 코드 포인트 기준 200자를 허용합니다. 등록·조회 응답의 `id`는 문자열이고, `createdAt`은 UTC 시각입니다.

MySQL에는 현재 브라우저 작성자 키의 SHA-256 해시를 저장합니다. 이 값은 목록에서 자신의 글을 제외하기 위한 임시 연결 키입니다. 세션 행의 만료 시각은 작성 후 기본 24시간으로 기록하며, 인증이나 자동 삭제에 사용하지 않습니다. 소원 기록의 기본 만료 시각은 비어 있습니다. 메모리 저장에 남아 있던 소원은 새 DB로 이전하지 않습니다.

## 후원 UI

메인 화면 우측 상단에는 벚꽃 꽃잎 한 장 모양의 버튼만 표시합니다. 엽전 명칭과 아이콘은 사용하지 않습니다. 버튼을 클릭하거나 터치하면 모바일 세로 화면에도 맞는 후원 팝업이 열립니다. 팝업에는 교체 가능한 빈 QR 영역과 닫기 버튼을 둡니다. 제목, 설명, 하단 안내 문구는 확정 후 추가합니다.

후원은 자율이며 모든 방문자에게 동일한 기능을 제공합니다. 공식 이용 조건과 계약 여부를 확인한 뒤에 실제 QR 이미지와 제공 방식을 결정합니다. 임시 QR, 결제 API, 송금 기능은 추가하지 않습니다.

[서비스 요구사항](NARU_REQUIREMENTS.md) · [아키텍처](NARU_ARCHITECTURE.md) · [개발 계획](NARU_DEVELOPMENT_PLAN.md)
