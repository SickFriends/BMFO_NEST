오태식과 친구들 실행을 위한 아키텍처 유지보수 및 보완사항.

아래의 아키텍처는 다음 오태식과친구들이 개발을 할 수 있도록 하기 위해 필요한 시스템들이다.

1. 결제가 다 되었다고해서 바로 startUsingLocker()를 실행하지 않는다.
2. 판매자가 문을 열 때, 주문 번호가 있는 locker에만 문을 열 수 있도록 한다. (오남용 방지)
3. 문이 닫혔을 때에 임베에서 메인서버로 요청을 보내도록하는 API를 메인서버에 만든다.
   1. 문이 닫혔을 때엔 임베 -> 메인서버로 요청을 하고 (메인서버에서는 물건이 들어있는지에 대한 여부, 라커 번호를 받는다.)
      1. 문이 닫혔을 때 해당 라커가 주문 번호를 가지고 있고 대기중이고, 물건이 들어있다면, startUsingLocker()를 실행한다 (즉 해당 locker를 사용중으로 업데이트 시킨다).
      2. 문이 닫혔을 때 해당 라커가 주문 번호를 가지고 있고 사용중이고, 물건이 들어있지 않다면,
         returnLocker()를 실행한다 (즉 해당 locker를 반환함으로써 미사용중으로 업데이트시킨다)
      3. 문이 닫혔을 때 해당 라커가 주문 번호를 가지고 있고 사용중이고, 물건이 들어있다면,
         아직 물건을 제대로 가지고 가지 않았으므로 openLocker()를 실행한다 (즉 다시 문을 연다)

일단은 임베디드 장치에 장치에 각각 버튼을 하나씩 단다.
또 물건을 감지 하는 센서도 하나씩 단다.

그런데 라커가 많아지게 된다면 물체감지 센서, 문 닫힘 인식 버튼, 문 개폐장치 등을 모두 다 하나의 라즈베리파이에 연결 할 수 없기 때문에,
마이크로프로세서(MCU) 이용을 통해서 여러 라커를 연결해서 서비스를 진행하기를 바란다.

1. 물건을 구매할 때, 미리 금액권등을 토스로 구매해서 물건을 사는 때에는 토스 대신 포인트로 결제 할 수 있게 하기. (네이버 포인트 개념) 이유-> 점심시간에 학생들이 휴대폰을 낸 상태로 있음.
