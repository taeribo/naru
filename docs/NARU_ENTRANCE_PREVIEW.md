# NARU 신사 입구와 벚꽃 광장

기본 주소에서 도리이 앞에 입장한다. 바닥을 눌러 이동하거나 방향 버튼으로 계단을 올라 도리이를 통과한다. 입구부터 벚꽃 광장까지 하나의 3D 장면과 접속을 사용하며 카메라가 계단 높이와 캐릭터 이동을 따라간다.

## 장면 구성

- 도리이는 광장 입장 계단의 착지대에 있고, 도리이 너머 중앙에 벚꽃나무가 있다. 왼쪽 찻집과 오른쪽 건물은 각도를 달리해 진입로를 감싼다.
- 입구와 광장을 같은 석재 바닥과 지형으로 연결한다. 카메라에는 기존 드래그 회전, 휠과 핀치 확대·축소를 적용한다.
- 좌표가 없던 GLB 메시에는 표면 방향을 기준으로 UV를 생성한다. 석재·목재·기와에는 기존 로컬 PBR 맵을 사용한다.
- 촬영 HDR 파노라마와 광장 조명을 공유한다. 입구 석등 두 곳에 따뜻한 점광원을 둔다.

## 에셋 출처

모델은 `frontend/public/models/shrine-preview/`에 저장한다. 공급 페이지의 CC0 라이선스를 확인했다. 다섯 파일 합계는 636,480바이트다. 건축 모델은 외부 제작 저폴리곤 에셋이며, 근접 표현을 위한 목조 디테일과 조경용 수목 에셋은 후속 검토 대상이다.

| 파일 | 원본 |
| --- | --- |
| torii.glb | [3DAssets.dev Torii Gate](https://3dassets.dev/assets/feudal-japan-castle-town-torii-gate-2b436156) |
| shrine-hall.glb | [3DAssets.dev Shrine Hall](https://3dassets.dev/assets/feudal-japan-castle-town-shrine-hall-fda8cd9c) |
| tea-house.glb | [3DAssets.dev Tea House](https://3dassets.dev/assets/feudal-japan-castle-town-tea-house-a168f962) |
| stone-lantern.glb | [3DAssets.dev Stone Lantern](https://3dassets.dev/assets/feudal-japan-castle-town-stone-lantern-e37226d1) |
| mossy-boulders.glb | [3DAssets.dev Mossy Boulder Cluster](https://3dassets.dev/assets/fps-survival-forest-outpost-boulder-cluster-3fd6db72) |

기존 석재·목재·기와 PBR 맵과 1024×512 Evening Road 01 HDRI를 재사용한다. [기존 재질 출처와 가공 기록](NARU_GRAPHICS.md) · [Poly Haven CC0](https://polyhaven.com/license)

## 후속 검증

- 휴대전화 Safari·Chrome에서 렌더링 속도, 초기 로딩, 터치 조작을 측정한다.
- 상업 배포가 가능한 벚꽃나무, 일본 소나무, 관목 에셋을 확보하고 실사용 시점에서 모델 복잡도와 디테일을 검토한다.
- 본당에 가까이 다가갔을 때 필요한 처마와 목재 결구 디테일, 지형과 건축물의 접촉부를 보강한다.
