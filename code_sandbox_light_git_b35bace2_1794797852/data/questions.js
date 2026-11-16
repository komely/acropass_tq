/* ============================================================
   16문항 (시안) — 4개 축 × 4문항
   - axis: timing | shape | cause | response
   - options[i].pole: 해당 선택지가 가리키는 극 (R/S, H/F, I/E, Q/W)
   - weight: 핵심 문항은 1.5 (축당 합계 4.5 → 동점 불가)
   - 순서는 타이밍→형태→요인→대응을 4바퀴 섞은 배치입니다.
   ============================================================ */
window.TQ_DATA = window.TQ_DATA || {};

window.TQ_DATA.questions = [
  /* 1바퀴 */
  { id: 'q01', axis: 'timing', weight: 1.5, text: '트러블이 올라오는 시기를 떠올려보면?',
    options: [ { text: '비슷한 시기에 또 온다', pole: 'R' }, { text: '예고 없이 불쑥 온다', pole: 'S' } ] },
  { id: 'q02', axis: 'shape', weight: 1.5, text: '올라온 트러블을 살짝 만져보면?',
    options: [ { text: '겉만 살짝 올라온 느낌', pole: 'F' }, { text: '속에 단단하게 자리 잡은 느낌', pole: 'H' } ] },
  { id: 'q03', axis: 'cause', weight: 1.5, text: '트러블이 올라오기 전날을 떠올려보면?',
    options: [ { text: '잠이 부족했거나 마음이 바빴다', pole: 'I' }, { text: '메이크업이나 마스크를 오래 했다', pole: 'E' } ] },
  { id: 'q04', axis: 'response', weight: 1.5, text: '트러블을 발견하면 나는?',
    options: [ { text: '일단 손부터 간다', pole: 'Q' }, { text: '며칠 지켜본다', pole: 'W' } ] },

  /* 2바퀴 */
  { id: 'q05', axis: 'timing', weight: 1, text: '한 달 달력을 펼쳐보면, 트러블이 올라온 날은?',
    options: [ { text: '제각각이라 종잡을 수 없다', pole: 'S' }, { text: '대충 패턴이 보인다', pole: 'R' } ] },
  { id: 'q06', axis: 'shape', weight: 1, text: '옆에서 거울을 보면 트러블은?',
    options: [ { text: '도톰하게 솟아 있다', pole: 'H' }, { text: '넓고 납작하게 올라와 있다', pole: 'F' } ] },
  { id: 'q07', axis: 'cause', weight: 1, text: '피부가 유독 예민해지는 순간은?',
    options: [ { text: '새 화장품·마스크처럼 닿는 것이 바뀔 때', pole: 'E' }, { text: '야근·시험처럼 바쁜 시즌', pole: 'I' } ] },
  { id: 'q08', axis: 'response', weight: 1, text: '외출 전 트러블이 눈에 띄면?',
    options: [ { text: '바로 가리거나 케어한다', pole: 'Q' }, { text: '신경 쓰이지만 일단 둔다', pole: 'W' } ] },

  /* 3바퀴 */
  { id: 'q09', axis: 'timing', weight: 1, text: '중요한 일정을 앞두고 트러블을 만나면?',
    options: [ { text: '‘올 게 왔구나’ 싶다', pole: 'R' }, { text: '‘왜 하필 지금?’ 싶다', pole: 'S' } ] },
  { id: 'q10', axis: 'shape', weight: 1, text: '트러블 부위에 손끝이 닿으면?',
    options: [ { text: '따끔하거나 간질한 느낌', pole: 'F' }, { text: '묵직하고 뻐근한 느낌', pole: 'H' } ] },
  { id: 'q11', axis: 'cause', weight: 1, text: '주말에 푹 쉬고 나면 피부는?',
    options: [ { text: '한결 편안해진 느낌이다', pole: 'I' }, { text: '별 차이를 못 느낀다', pole: 'E' } ] },
  { id: 'q12', axis: 'response', weight: 1, text: '누가 “어, 뭐 올라왔네?” 하고 말하면?',
    options: [ { text: '바로 거울부터 보러 간다', pole: 'Q' }, { text: '그런가 보다 하고 넘긴다', pole: 'W' } ] },

  /* 4바퀴 */
  { id: 'q13', axis: 'timing', weight: 1, text: '트러블이 올라오는 자리는?',
    options: [ { text: '올 때마다 자리가 다르다', pole: 'S' }, { text: '늘 비슷한 자리에 온다', pole: 'R' } ] },
  { id: 'q14', axis: 'shape', weight: 1, text: '트러블이 오래 머문 자리는 어떤 느낌이야?',
    options: [ { text: '속이 단단하게 남아 있는 느낌', pole: 'H' }, { text: '겉결이 거칠게 느껴지는 느낌', pole: 'F' } ] },
  { id: 'q15', axis: 'cause', weight: 1, text: '피부에 닿는 게 거의 없는 날에도 트러블이 올라온 적 있어?',
    options: [ { text: '자주 있다', pole: 'I' }, { text: '마스크·머리카락·휴대폰이 닿은 날이 더 많다', pole: 'E' } ] },
  { id: 'q16', axis: 'response', weight: 1, text: '트러블이 생기면 첫 행동은?',
    options: [ { text: '케어 루틴부터 꺼낸다', pole: 'Q' }, { text: '평소 루틴대로 지낸다', pole: 'W' } ] }
];
