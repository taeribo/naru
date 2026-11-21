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
- 현재 Health API는 로그인과 DB 연결 없이 사용할 수 있습니다. MySQL 개발 연결은 선택형으로 구성합니다. 기능의 영속 저장과 Spring WebSocket은 해당 기능을 구현하는 단계에서 추가합니다.

## 서비스 범위

초기 목표는 동일한 맵을 사용하는 독립 공간 2개를 운영하고, 공간당 최대 30명이 참여하는 것입니다. 확장 목표는 공간 10개와 동시 접속 300명입니다. 체험은 풍등과 운세 8종이며 무료 이용과 선택형 자율 후원을 계획합니다.

## 소원 목록

`GET /api/wishes`와 `POST /api/wishes`는 로그인 없이 사용할 수 있습니다. 브라우저는 로컬 저장소에 생성한 방문 식별자로 자기 소원을 목록에서 제외합니다. 서버는 최근 100건을 메모리에 보관하며 재시작하면 초기화됩니다. 목록은 다른 방문자의 최근 소원 30건을 보여줍니다. 정적 빌드를 제공하는 환경에서는 같은 출처의 `/api`를 Spring Boot로 전달하도록 구성합니다.

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

MySQL은 사용자 계정으로 `SELECT 1`을 실행할 수 있을 때 준비 상태가 됩니다. 백엔드는 그 이후 시작하며, `mysql` Spring 프로필에서 JDBC로 `SELECT 1`을 실행합니다. 성공하면 백엔드 로그에 `MySQL JDBC connection verified`가 표시됩니다. DB는 Compose 내부 네트워크에서 접근하고 데이터는 `mysql-data` 볼륨에 저장합니다. MySQL 이미지는 새 데이터 볼륨을 처음 초기화할 때 계정과 비밀번호를 적용합니다. 현재 소원 API는 서버 메모리를 사용합니다.

중지할 때 구성 파일을 동일하게 지정합니다.

```sh
docker compose -f compose.yaml -f compose.mysql.yaml down
```


## 후원 UI

메인 화면 우측 상단에는 벚꽃 꽃잎 한 장 모양의 버튼만 표시합니다. 엽전 명칭과 아이콘은 사용하지 않습니다. 버튼을 클릭하거나 터치하면 모바일 세로 화면에도 맞는 후원 팝업이 열립니다. 팝업에는 교체 가능한 빈 QR 영역과 닫기 버튼을 둡니다. 제목, 설명, 하단 안내 문구는 확정 후 추가합니다.

후원은 자율이며 모든 방문자에게 동일한 기능을 제공합니다. 공식 이용 조건과 계약 여부를 확인한 뒤에 실제 QR 이미지와 제공 방식을 결정합니다. 임시 QR, 결제 API, 송금 기능은 추가하지 않습니다.

[서비스 요구사항](NARU_REQUIREMENTS.md) · [아키텍처](NARU_ARCHITECTURE.md) · [개발 계획](NARU_DEVELOPMENT_PLAN.md)
