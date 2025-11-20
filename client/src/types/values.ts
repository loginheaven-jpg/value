export interface Value {
  id: number;
  korean: string;
  english: string;
  description: string;
  category: string;
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
    instruction: "80개의 가치 중에서 당신에게 의미가 큰 20개를 선택해주세요. (한번 클릭: 선택, 두번 클릭: 해제)",
    from: 80,
    to: 20,
  },
  {
    step: 2,
    title: "2단계: 더 좁혀가기",
    instruction: "선택한 20개 중에서 더 중요한 10개를 선택해주세요. (한번 클릭: 선택, 두번 클릭: 해제)",
    from: 20,
    to: 10,
  },
  {
    step: 3,
    title: "3단계: 핵심 가치 찾기",
    instruction: "10개 중에서 가장 중요한 5개를 선택해주세요. (한번 클릭: 선택, 두번 클릭: 해제)",
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
