이 폴더에는 각 프로젝트의 hex 파일을 넣습니다.

권장 파일 이름 (각 페이지의 data-hex 값과 맞추세요):
  pedometer.hex     - 1. 만보기
  clock.hex         - 2. 시계
  compass.hex       - 3. 스마트 나침반
  quake.hex         - 4. 지진 대피 알림
  quake-radio.hex   - 5. 지진 대피 라디오 알림
  fan.hex           - 6. 스마트 선풍기

파일을 넣은 뒤, 해당 HTML 파일에서 data-hex="" 안에 경로를 적어 주세요.
  예) <a class="btn" href="#" data-mc="hex" data-hex="files/pedometer.hex">hex 파일 받기</a>
