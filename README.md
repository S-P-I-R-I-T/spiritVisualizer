# Pedro Pathing Visualizer

Big Thanks to #16166 Watt's Up for developing this, we really appreciate your work.

---

# S.P.I.R.I.T Visualizer
f54357e (4월4일) 커밋 기반으로 작성되었습니다. 추후 커밋이 발생할 경우 빠르게 업데이트 하도록 하겠습니다.


## 변경 사항 
### 기능 추가
- Java 코드 내보내기 (Full Code): 경로만 있는 빈 상태머신 대신, 실행하면 바로 경로를 따라 움직이는 완전한 자율주행 코드를 생성.
  - 각 경로 세그먼트를 `Pose`/`PathChain`/`PathState` enum으로 분리
  - `statePathUpdate()` 스위치 상태머신 자동 생성 (`follower.followPath` + `!follower.isBusy()` 대기)
  - 클래스명/`@Autonomous` 이름을 `.pp` 파일명에서 자동 유도
- 액션(Action) 시스템: 경로 사이에 실행 코드를 삽입할 수 있는 액션 추가
  - 액션 행에서 Java 코드 직접 입력 (예: `action.Outtake_On(2);`)
  - 코드 스니펫 프리셋 + 스니펫 관리 모달 (localStorage에 저장됩니다)
- 이동 중 액션(Moving Action): 경로에 붙여 follower가 해당 경로를 추종하는 동안 매 루프 실행되는 액션
- Android Studio로 내보내기: 생성된 Java 코드를 열려 있는 Android Studio 프로젝트로 바로 전송
  - 플러그인은 웹에서 다운로드 가능 (`/spirit-android-studio-plugin-1.0.0.zip`)
  - localhost:8356로 코드 전송후 `TeamCode/src/main/java/org/firstinspires/ftc/teamcode/`에 파일 생성 
- URL로 내보내기: 현재 경로의 모든 값(시작점, 경로, 장애물, 순서, 설정)을 압축 후 URL 해시로 인코딩해 공유

### 한국어 번역
- 일부 변수를 제외한 웹사이트 내용을 한국어로 번역하였습니다.
- 오타, 오류가 있는 경우 이슈 생성해주세요.

### 미사용 코드 정리
- 원본 저장소에서 사용되지 않던 코드들을 삭제했습니다.

## KRC 화이팅
한국 FTC 팀들의 수준 높은 오토노머스 구동에 기여가 되면 좋겠습니다!