export interface Value {
  id: number;
  korean: string;
  english: string;
  description: string;
  category: string;
  /**
   * 성찰 질문 2개. 카드당 고유하며 결과 화면에서 쓴다(Phase 38).
   * 한글명이 아니라 id 로 카드에 붙어 있으므로 카드 이름이 바뀌어도 끊기지 않는다.
   * 런타임에 만들어지는 커스텀 가치는 빈 배열이며 기본 질문으로 떨어진다.
   */
  questions: string[];
}

export type Step = 1 | 2 | 3 | 4 | 5;

export interface StepConfig {
  step: Step;
  title: string;
  instruction: string;
  from: number;
  to: number;
}

export const STEP_CONFIGS: StepConfig[] = [
  {
    step: 1,
    title: "1단계: 첫 번째 선택",
    instruction: "'마음이 더 끌리는' 카드 20개를 선택해주세요. '그래야만하지, 이게 중요한 게 맞지' 이런 생각은 내려 놓으세요.\n(한번 클릭: 선택, 두번 클릭: 해제)",
    from: 72,
    to: 20,
  },
  {
    step: 2,
    title: "2단계: 더 좁혀가기",
    instruction: "'이것 없이는 정말 나답지 않아' 라고 생각되는 10개를 선택해 주세요.",
    from: 20,
    to: 10,
  },
  {
    step: 3,
    title: "3단계: 핵심 가치 찾기",
    instruction: "당신의 삶에서 절대 타협할 수 없는, 당신의 인생을 대표하는 5개의 가치를 골라주세요.",
    from: 10,
    to: 5,
  },
  {
    step: 4,
    title: "4단계: 최종 선택",
    instruction: "마지막으로, 당신의 삶을 이끄는 핵심 가치 3개를 선택해주세요.",
    from: 5,
    to: 3,
  },
  {
    step: 5,
    title: "완료: 당신의 가치",
    instruction: "축하합니다! 당신의 핵심 가치를 발견했습니다.",
    from: 3,
    to: 3,
  },
];
