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
  /**
   * 진행바에서 개수 대신 보여줄 문자열. 1단계는 분류라 목표 개수가 없고,
   * 4단계는 쌍대비교라 '3개'가 그 단계의 일을 설명하지 못한다.
   * `to` 는 건드리지 않는다 — Sort 의 선택 게이트와 기존 테스트가 그 값을 읽는다.
   */
  barLabel?: string;
}

export const STEP_CONFIGS: StepConfig[] = [
  {
    step: 1,
    title: "1단계: 첫인상으로 나누기",
    instruction: "한 장씩 보여드립니다. 오래 생각하지 마세요. '그래야만 하지, 이게 중요한 게 맞지' 같은 생각은 내려놓고, 마음이 반응하는 대로 나누시면 됩니다.",
    from: 72,
    to: 20,
    barLabel: "분류",
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
    title: "4단계: 쌍대비교",
    instruction: "두 가지 중 하나를 선택한다면? 머리가 아닌 가슴으로, 직관적으로 선택해주세요. 정답은 없습니다.",
    from: 5,
    to: 3,
    barLabel: "비교",
  },
  {
    step: 5,
    title: "완료: 당신의 가치",
    instruction: "축하합니다! 당신의 핵심 가치를 발견했습니다.",
    from: 3,
    to: 3,
  },
];

// ── 1단계 분류(triage) ──────────────────────────────────────────────────────
// 72장을 한 화면에 펼치고 "정확히 20장"을 요구하던 것을 한 장씩 세 더미로 나누는 방식으로 바꾼다.
// 동시 비교가 순차 반응으로 바뀌고, 고르는 일이 반응하는 일이 된다.

export type TriageBucket = "yes" | "maybe" | "no";

export interface TriageState {
  /** 1부터. 재분류(yes 과다)마다 1씩 오른다. */
  round: number;
  /** 아직 판단하지 않은 카드. 1라운드 진입 시 한 번 섞고 이후 재정렬하지 않는다. */
  queueIds: number[];
  /** 카드 id → 더미. 라운드를 넘어 **누적**된다. */
  decisions: Record<number, TriageBucket>;
  /** 되돌리기용. 현재 라운드에서 판단한 순서이며 라운드 경계를 넘지 않는다. */
  history: number[];
  /** 보충 선택 진입 직전의 더미. 그 화면에서 선택을 해제하면 여기로 되돌린다. */
  topUpOrigin?: Record<number, TriageBucket>;
  timestamp: number;
}

export type TriageOutcome =
  | { action: "proceed"; valueIds: number[] }
  | { action: "rerun"; source: "yes"; message: string }
  | { action: "topUp"; need: number; message: string };

/**
 * 2단계는 정확히 10장을 요구한다(`STEP_CONFIGS[1].to`). 후보가 10장이면 선택이 아니라
 * 전원 통과가 되고 11장이면 사실상 1장 버리기다. 최소한의 선택 여지를 남기는 하한이 12다.
 *
 * **불변식: 후보가 12장 미만이면 어떤 경로로도 2단계로 보내지 않는다.**
 * 이 하한을 어기면 2단계의 '다음' 버튼이 렌더되지 않아 화면이 잠긴다.
 */
export const TRIAGE_FLOOR = 12;
/** 이 수를 넘으면 한 번 더 나누기를 권한다. 강제는 아니다. */
export const TRIAGE_CEIL = 24;
/** 재분류 상한. 이 라운드에 이르면 과다여도 그대로 보낸다(무한 루프 방지). */
export const TRIAGE_MAX_ROUND = 3;

export function resolveTriageOutcome(
  decisions: Record<number, TriageBucket>,
  round: number
): TriageOutcome {
  const idsOf = (bucket: TriageBucket): number[] =>
    Object.keys(decisions)
      .map(Number)
      .filter((id) => decisions[id] === bucket);

  const yes = idsOf("yes");

  // 하한 검사가 먼저다. 라운드 상한이 이 검사를 건너뛰면 잠긴 화면으로 보내게 된다.
  if (yes.length < TRIAGE_FLOOR) {
    return {
      action: "topUp",
      need: TRIAGE_FLOOR - yes.length,
      message: "조금만 더 골라 주세요.",
    };
  }

  if (yes.length > TRIAGE_CEIL && round < TRIAGE_MAX_ROUND) {
    return {
      action: "rerun",
      source: "yes",
      message: "고르신 카드가 많군요. 이 카드들만 한 번 더 나눠 볼까요?",
    };
  }

  return { action: "proceed", valueIds: yes };
}

/**
 * 1단계에 카드를 내보낼 순서. **무작위가 아니다.**
 *
 * 같은 카테고리 카드가 연달아 나오면 판단이 무뎌진다('관계'는 14장이다).
 * 카테고리별로 `(k + 0.5) / size` 위치를 매겨 그 순서로 펴면, 큰 묶음은 촘촘히
 * 작은 묶음은 성기게 놓여 전 구간에 흩어진다. RNG 가 없으므로 배열을 테스트가 잰다.
 */
export function buildTriageQueue(values: Value[]): number[] {
  const byCategory = new Map<string, Value[]>();
  for (const value of values) {
    const list = byCategory.get(value.category);
    if (list) list.push(value);
    else byCategory.set(value.category, [value]);
  }

  // tsconfig 에 target 이 없어 Map 순회에 for-of 를 쓸 수 없다(TS2802). Array.from 으로 편다.
  const placed: Array<{ pos: number; id: number }> = [];
  Array.from(byCategory.values()).forEach((list) => {
    list.forEach((value, k) => placed.push({ pos: (k + 0.5) / list.length, id: value.id }));
  });

  // 위치가 같으면 id 로 갈라 안정 정렬을 보장한다. 같은 입력이면 언제나 같은 배열이다.
  placed.sort((a, b) => a.pos - b.pos || a.id - b.id);
  return placed.map((entry) => entry.id);
}

// ── 분류 상태 전이 ──────────────────────────────────────────────────────────
// 화면 밖에 둔다. 전이가 컴포넌트 안에 있으면 렌더러 없이는 잴 수 없고,
// 원본 §9 Phase 40 의 회귀 기준('후보군이 yes 더미와 일치'·'되돌리기가 직전 판단을 취소')이
// 검증 불가가 된다. `timestamp` 는 건드리지 않는다 — 시각은 호출자가 찍는다.

/** 큐 맨 앞 카드를 한 더미로 보낸다. */
export function decideCard(state: TriageState, bucket: TriageBucket): TriageState {
  if (state.queueIds.length === 0) return state;
  const [id, ...rest] = state.queueIds;
  return {
    ...state,
    queueIds: rest,
    decisions: { ...state.decisions, [id]: bucket },
    history: [...state.history, id],
  };
}

/**
 * 직전 판단을 취소한다. 카드는 큐 맨 앞으로 돌아오고 판단은 지워진다.
 * `history` 는 라운드마다 비므로 되돌리기는 라운드 경계를 넘지 않는다 —
 * 2라운드에서 아무리 되돌려도 1라운드의 no·maybe 판단은 남는다.
 */
export function undoDecision(state: TriageState): TriageState {
  if (state.history.length === 0) return state;
  const id = state.history[state.history.length - 1];
  const decisions = { ...state.decisions };
  delete decisions[id];
  return {
    ...state,
    queueIds: [id, ...state.queueIds],
    decisions,
    history: state.history.slice(0, -1),
  };
}

/**
 * yes 더미만 다시 큐에 올려 한 라운드를 더 돈다.
 * `order` 는 정본 배열(`buildTriageQueue`)이다. 재분류 때도 같은 순서를 쓴다.
 */
export function startRerun(state: TriageState, order: number[]): TriageState {
  const yesIds = order.filter((id) => state.decisions[id] === "yes");
  const decisions = { ...state.decisions };
  yesIds.forEach((id) => delete decisions[id]);
  return {
    round: state.round + 1,
    queueIds: yesIds,
    decisions,
    history: [],
    timestamp: state.timestamp,
  };
}

