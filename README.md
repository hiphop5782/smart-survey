# smart-survey · 배움나침반

교육과정 시작 전 학습자의 경험, 코드 친숙도, 기술 용어 인지도, AI 활용 습관과 기대를 파악하는 범용 사전 진단 설문 플랫폼입니다.

- 서비스 예정 주소: `https://survey.sysout.co.kr`
- 프런트엔드: React + Vite + TypeScript
- 호스팅: GitHub Pages
- 데이터: 같은 저장소의 `data` 브랜치에 JSON으로 관리
- 별도 DB·백엔드·Cloudflare Workers: 사용하지 않음

## 주요 기능

- 8종 동적 문항: 단일/복수 선택, 짧은/긴 주관식, 척도, 코드 인지도, 용어 매트릭스, 코드 해석
- 공통·Python/AI·Java 웹·데이터 분석·생성형 AI 템플릿
- 프로그래밍 스택 선택 시 JSON 카탈로그에서 관련 문항 자동 생성
- 관리자 설문 생성, 편집, 복제, 미리보기, JSON 가져오기·내보내기
- 관리자 런타임 PAT를 이용한 `data` 브랜치 저장 및 재조회 검증
- 모바일 학생 설문, 진행률, 필수값 검사, 응답 JSON 다운로드
- 응답 JSON 일괄 가져오기, 동적 통계, 코드 퀴즈 정답률, CSV/JSON 내보내기
- GitHub Actions 기반 테스트·빌드·Pages 배포

## 로컬 실행

```bash
npm install
npm run dev
```

검증:

```bash
npm test
npm run typecheck
npm run build
```

## URL

- 홈: `/#/`
- 관리자: `/#/admin`
- 설문 생성: `/#/admin/surveys/new`
- 학생 설문: `/#/s/{surveyId}`
- 결과 분석: `/#/admin/surveys/{surveyId}/results`

HashRouter를 사용하므로 GitHub Pages에서 직접 새로고침해도 서버 경로 오류가 발생하지 않습니다.

## `data` 브랜치 준비

최초 한 번 저장소 관리자가 `data` 브랜치를 만들고 템플릿을 넣어야 합니다. 초기 `data` 브랜치에는 다음 구조가 사용됩니다. 초기 파일은 `npm run data:seed`로 `.data-seed` 폴더에 재생성할 수 있습니다.

```text
templates/
  index.json
  common.json
  python-ai.json
  java-web.json
  data-analytics.json
  generative-ai.json
  stack-catalog.json
surveys/
  index.json
  demo-python-ai-2026/
    survey.json
```

새 교육과정은 `templates/{templateId}.json`을 추가하고 `templates/index.json`에 등록하면 됩니다. 새 프로그래밍 스택은 `templates/stack-catalog.json`의 `stacks` 배열에 정의합니다. React 소스를 수정할 필요가 없습니다.

관리자 UI는 data 브랜치의 카탈로그를 우선 읽고, 아직 브랜치가 없거나 네트워크 오류가 있으면 빌드에 포함된 동일한 데모 카탈로그로 대체합니다.

## 관리자 GitHub 저장

1. GitHub에서 fine-grained personal access token을 만듭니다.
2. Repository access는 `hiphop5782/smart-survey` 하나만 선택합니다.
3. Repository permissions에서 `Contents: Read and write`만 부여합니다.
4. 신뢰할 수 있는 기기에서 관리자 화면을 열고 토큰을 입력합니다.
5. 설문을 검증한 뒤 `GitHub에 저장`을 누릅니다.

토큰은 현재 React 메모리에만 유지됩니다. 새로고침하면 사라지며 소스, 빌드, URL, localStorage, sessionStorage, 로그에 기록하지 않습니다. 게시 설문 수정 시 revision을 증가시키고 `revisions/{revision}.json` 스냅샷을 함께 저장합니다. 저장 성공 후 파일을 다시 읽어 실제 내용이 일치할 때만 성공으로 표시합니다.

## 학생 응답 수집

GitHub Pages만으로 비로그인 학생 응답을 자동 저장할 수 없습니다. 학생의 `응답 JSON 내려받기`는 GitHub 제출이 아니며 강사에게 자동 전송되지 않습니다.

권장 흐름:

1. 학생이 응답 JSON을 내려받습니다.
2. 강사가 안내한 조직 승인 파일 전달 경로로 제출합니다.
3. 강사가 결과 화면에서 파일을 일괄 가져옵니다.
4. 분석과 CSV/JSON 내보내기는 브라우저 안에서 수행됩니다.

실제 학생 응답은 공개 저장소에 평문으로 올리지 마세요. 자세한 내용은 [제한 사항](docs/LIMITATIONS.md)을 확인하세요.

## GitHub Pages 및 도메인 수동 설정

1. GitHub 저장소의 **Settings → Pages**로 이동합니다.
2. Source를 **GitHub Actions**로 선택합니다.
3. `main`에 푸시된 `Deploy GitHub Pages` 워크플로가 성공했는지 확인합니다.
4. Custom domain에 `survey.sysout.co.kr`을 입력하고 DNS 확인 후 **Enforce HTTPS**를 활성화합니다.
5. DNS 관리 화면에서 `survey` CNAME을 `hiphop5782.github.io`로 지정합니다.
6. DNS 전파 후 `https://survey.sysout.co.kr`과 HashRouter 경로를 확인합니다.

`public/CNAME`도 동일한 도메인을 포함합니다. DNS와 Pages 설정은 권한 있는 관리자가 직접 적용하고 실제 상태를 확인해야 합니다.

## 데이터와 보안 원칙

- 직접 식별정보는 기본 문항에서 수집하지 않습니다.
- 공개 저장소에 실제 학생 응답을 커밋하지 않습니다.
- 연령대·전공·경력을 실력 점수에 포함하지 않습니다.
- 자기평가와 실제 코드 해석 정답률을 분리합니다.
- 공개 설문 JSON에 코드 퀴즈 정답을 넣지 않습니다.
- 예시 통계는 항상 `DEMO`로 표시합니다.
- GitHub API의 `401/403/404/409/422` 오류를 사용자에게 구분해 안내합니다.

## 배포 워크플로

`.github/workflows/deploy-pages.yml`은 `main` 변경 또는 수동 실행에만 반응합니다. `data` 브랜치 변경은 Pages 재배포를 일으키지 않습니다. 워크플로 권한은 `contents: read`, `pages: write`, `id-token: write`로 제한됩니다.
