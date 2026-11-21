# naru
풍등, 운세뽑기

나루(NARU)는 한국적인 야간 돌광장에서 벚꽃 아래 운세를 보고 풍등에 소원을 띄우는 3D 웹 체험입니다.

## Docker로 시작하기

Docker Desktop을 실행한 뒤 Git 루트인 `naru/`에서 다음 명령을 실행합니다.

```sh
docker compose up --build -d --wait
```

- 화면은 `http://localhost:5173`에서 엽니다.
- 프론트엔드를 경유하는 백엔드 연결은 `http://localhost:5173/api/health`에서 확인합니다. 정상 응답은 `{"status":"UP"}`입니다.
- 중지는 `docker compose down`입니다. IntelliJ에서 띄운 개발 서버가 같은 포트를 사용 중이면 먼저 종료하거나 루트 `.env`에서 호스트 포트를 바꿉니다.

MySQL 또는 같은 Wi‑Fi의 휴대폰에서 접속하는 방법은 [Docker 개발 환경](docs/development.md#docker-개발-환경)을 참고하세요.

## IntelliJ IDEA에서 시작하기

1. Git 루트인 `naru/`를 IntelliJ IDEA에서 엽니다. Project SDK는 JDK 17을 선택합니다.
2. `backend/build.gradle`을 Gradle 프로젝트로 연결합니다. Gradle 설정에서 배포판은 Wrapper, Gradle JVM은 JDK 17을 선택합니다.
3. Gradle 도구 창에서 백엔드의 `bootRun` 태스크를 실행합니다. `http://localhost:8080/api/health`에서 HTTP 200과 `{"status":"UP"}`을 확인합니다. 포트 변경이 필요하면 실행 구성에 `SERVER_PORT` 환경변수를 설정합니다.
4. IntelliJ 터미널에서 `frontend/`로 이동해 아래 명령을 실행하고 `http://localhost:5173`을 엽니다. Node.js 24와 npm 11이 필요합니다.

```sh
cd frontend
npm ci
npm run dev
```

장면에서 드래그하면 회전하고 휠 또는 두 손가락으로 확대·축소할 수 있습니다. 모바일 실기기에서 확인하려면 같은 네트워크에서 `npm run dev -- --host 0.0.0.0`을 실행하고 휴대폰에서 `http://<개발-PC의-LAN-IP>:5173`을 엽니다. WebGL 2를 지원하는 브라우저가 필요합니다.

## 검증 명령

프론트엔드와 백엔드는 별도 터미널에서 실행할 수 있습니다. 다른 방문자의 소원 조회와 전송은 백엔드 실행이 필요합니다. Vite 개발 서버와 미리보기는 기본적으로 `/api` 요청을 `http://127.0.0.1:8080`으로 전달합니다. 백엔드 포트가 다르면 프론트엔드 실행 환경에 `NARU_API_TARGET`을 설정합니다.

```sh
# frontend/에서 실행
npm run build
npm run lint
npm run format:check

# backend/에서 실행
./gradlew test build
./gradlew bootRun
```

Windows 명령 프롬프트에서는 `gradlew.bat test build` 및 `gradlew.bat bootRun`을 사용합니다. 백엔드 실행 후 별도 터미널에서 `curl -i http://localhost:8080/api/health`를 실행합니다. 첫 설치에는 npm 레지스트리, Gradle 배포 서버, Gradle Plugin Portal, Maven Central에 접근할 수 있어야 합니다.

[프로젝트 구조와 팀 개발 기준](docs/development.md)
