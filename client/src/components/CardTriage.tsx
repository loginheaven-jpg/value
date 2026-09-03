import { Button } from "@/components/ui/button";
import { ValueCard } from "@/components/ValueCard";
import { TriageBucket, TRIAGE_CEIL, Value } from "@/types/values";
import { cn } from "@/lib/utils";
import { ChevronDown, Undo2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

/**
 * 1단계 분류 화면.
 *
 * 72장을 한 화면에 펼치고 "정확히 20장"을 요구하던 것을 한 장씩 세 더미로 나누는 방식으로
 * 바꾼다. 동시 비교가 순차 반응이 되면 고르는 일이 반응하는 일이 된다.
 *
 * 화면 순서와 키 순서를 맞춘다 — 아니요(←) · 글쎄요(↓) · 네(→).
 */

const BUCKETS: Array<{
  bucket: TriageBucket;
  label: string;
  hint: string;
  className: string;
}> = [
  {
    bucket: "no",
    label: "아니요",
    hint: "←",
    className: "border-border hover:border-foreground/40 hover:bg-muted",
  },
  {
    bucket: "maybe",
    label: "글쎄요",
    hint: "↓",
    className: "border-border hover:border-accent hover:bg-accent/10",
  },
  {
    bucket: "yes",
    label: "네",
    hint: "→",
    className: "border-primary/40 text-primary hover:border-primary hover:bg-primary/10",
  },
];

const KEY_TO_BUCKET: Record<string, TriageBucket> = {
  ArrowLeft: "no",
  ArrowDown: "maybe",
  ArrowRight: "yes",
};

interface CardTriageProps {
  value: Value;
  /** 이번 라운드에서 몇 번째 카드인지(1부터). */
  position: number;
  /** 이번 라운드의 전체 장수. */
  total: number;
  round: number;
  yesCount: number;
  canUndo: boolean;
  onDecide: (bucket: TriageBucket) => void;
  onUndo: () => void;
}

export function CardTriage({
  value,
  position,
  total,
  round,
  yesCount,
  canUndo,
  onDecide,
  onUndo,
}: CardTriageProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // 입력 중이면 가로채지 않는다.
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;

      // Alt+← 는 브라우저 '뒤로가기'다(맥은 Cmd+←). 수식키를 검사하지 않으면 그것을 삼키고
      // 대신 카드를 '아니요' 로 보낸다 — 뒤로 가려던 동작이 조용히 판단으로 바뀐다.
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;

      // 키를 누르고 있으면 자동 반복이 초당 수십 장을 넘긴다. 되돌리기는 한 장씩뿐이다.
      if (event.repeat) return;

      const bucket = KEY_TO_BUCKET[event.key];
      if (bucket) {
        event.preventDefault();
        onDecide(bucket);
        return;
      }
      if (event.key === "Backspace" && canUndo) {
        event.preventDefault();
        onUndo();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onDecide, onUndo, canUndo]);

  const progress = total > 0 ? ((position - 1) / total) * 100 : 0;

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* 진행 상황 — 카드가 넘어갈 때마다 읽어 준다 */}
      <div className="space-y-2">
        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <p aria-live="polite" aria-atomic="true">
            {total}장 중 {position}장째
            {round > 1 && ` · ${round}번째 나누기`}
          </p>
          <p>지금까지 고른 카드 {yesCount}장</p>
        </div>
      </div>

      {/* 카드 한 장 */}
      <div
        key={value.id}
        className="rounded-2xl border-2 border-border bg-card p-8 shadow-sm text-center space-y-3 animate-in fade-in duration-200"
      >
        <div className="text-3xl font-bold text-foreground">{value.korean}</div>
        <div className="text-sm text-muted-foreground">{value.english}</div>
        <p className="text-base text-foreground/80 leading-relaxed pt-2">
          {value.description}
        </p>
      </div>

      {/* 세 더미 — 최소 44px 높이 */}
      <div className="grid grid-cols-3 gap-3">
        {BUCKETS.map((option) => (
          <button
            key={option.bucket}
            type="button"
            onClick={() => onDecide(option.bucket)}
            className={cn(
              "min-h-[56px] rounded-xl border-2 bg-card px-3 py-3",
              "font-semibold transition-colors active:scale-[0.98]",
              option.className
            )}
          >
            <span className="block">{option.label}</span>
            {/* 화살표는 눈으로 보는 힌트다. 읽어 주면 "아니요 왼쪽화살표"가 된다. */}
            <span
              aria-hidden="true"
              className="block text-xs font-normal text-muted-foreground mt-0.5"
            >
              {option.hint}
            </span>
          </button>
        ))}
      </div>

      <div className="flex justify-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={onUndo}
          disabled={!canUndo}
          className="gap-2 min-h-[44px]"
        >
          <Undo2 className="w-4 h-4" />
          방금 것 되돌리기
        </Button>
      </div>
    </div>
  );
}

/**
 * 한 라운드가 끝났는데 고른 카드가 상한을 넘었을 때.
 *
 * **권유이지 강제가 아니다.** 문구가 "나눠 볼까요?"라고 묻는 이상 거절할 수 있어야 한다.
 * 다만 거절이 곧 60장짜리 2단계 그리드를 뜻해서는 안 된다 — 그 과부하가 1단계를 분류로
 * 바꾼 이유였다. 그래서 **안전한 길을 기본 버튼에 놓는다.**
 *
 *   ① 검토 화면에서 줄이기 — 그리드에서 눌러 빼는 가장 빠른 길 (기본)
 *   ② 한 번 더 나누기      — 한 장씩 다시 보는 길
 *   ③ 그대로 가기          — 열려 있다. 다만 장수를 라벨에 적어 무엇을 고르는지 보이게 한다
 */
interface TriageRerunPromptProps {
  yesCount: number;
  message: string;
  onReview: () => void;
  onAccept: () => void;
  onDecline: () => void;
}

export function TriageRerunPrompt({
  yesCount,
  message,
  onReview,
  onAccept,
  onDecline,
}: TriageRerunPromptProps) {
  return (
    <div className="max-w-xl mx-auto text-center space-y-6 py-8">
      <div className="space-y-2">
        <p className="text-2xl font-bold text-foreground">{yesCount}장을 고르셨습니다</p>
        <p className="text-muted-foreground">{message}</p>
      </div>
      <div className="flex flex-col gap-3 items-stretch max-w-sm mx-auto">
        <Button size="lg" onClick={onReview} className="min-h-[48px]">
          검토 화면에서 줄이기
        </Button>
        <Button size="lg" variant="outline" onClick={onAccept} className="min-h-[48px]">
          한 번 더 나누기
        </Button>
        {/* 라벨에 장수를 적는다. '이대로 진행'만으로는 무엇을 고르는지 보이지 않는다. */}
        <Button size="lg" variant="ghost" onClick={onDecline} className="min-h-[48px]">
          {yesCount}장 그대로 2단계로 가기
        </Button>
      </div>
    </div>
  );
}

/**
 * 고른 카드 검토 화면. 세 자리에서 쓴다.
 *   ① 하한(12장)에 못 미쳐 보충이 필요할 때
 *   ② 상한(24장)을 넘겨 줄이기를 권할 때
 *   ③ 2단계에서 '이전 단계'로 돌아왔을 때
 *
 * 보류(글쎄요) 카드를 먼저 보여준다 — 참여자가 이미 한 번 마음이 움직였던 카드다.
 * 아니요로 보낸 카드는 접어 두고, 펼치면 카테고리별로 묶어 보여준다.
 */
interface TriageReviewProps {
  allValues: Value[];
  decisions: Record<number, TriageBucket>;
  yesIds: number[];
  /** 하한까지 몇 장이 모자란지. 0이면 검토만 하는 상태다. */
  need: number;
  overCeil: boolean;
  onToggle: (id: number) => void;
  onConfirm: () => void;
}

export function TriageReview({
  allValues,
  decisions,
  yesIds,
  need,
  overCeil,
  onToggle,
  onConfirm,
}: TriageReviewProps) {
  const [restOpen, setRestOpen] = useState(false);

  const byId = useMemo(
    () => new Map(allValues.map((value) => [value.id, value])),
    [allValues]
  );

  const chosen = useMemo(
    () => yesIds.map((id) => byId.get(id)).filter((v): v is Value => Boolean(v)),
    [yesIds, byId]
  );

  const maybes = useMemo(
    () => allValues.filter((value) => decisions[value.id] === "maybe"),
    [allValues, decisions]
  );

  const restByCategory = useMemo(() => {
    const groups = new Map<string, Value[]>();
    for (const value of allValues) {
      if (decisions[value.id] === "yes" || decisions[value.id] === "maybe") continue;
      const list = groups.get(value.category);
      if (list) list.push(value);
      else groups.set(value.category, [value]);
    }
    return Array.from(groups.entries());
  }, [allValues, decisions]);

  const gridClass = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3";

  return (
    <div className="space-y-8">
      {/* 안내 */}
      <div
        className={cn(
          "rounded-lg px-4 py-3 text-center",
          need > 0 ? "bg-accent/20" : "bg-primary/10"
        )}
        aria-live="polite"
      >
        {need > 0 ? (
          <p className="font-medium text-accent-foreground">
            조금만 더 골라 주세요. {need}장이면 충분합니다.
          </p>
        ) : overCeil ? (
          <p className="font-medium text-accent-foreground">
            지금 {chosen.length}장이 남았습니다. {TRIAGE_CEIL}장 아래로 줄이면 다음 단계가 한결
            수월합니다. 덜 끌리는 카드를 눌러서 빼 주세요.
          </p>
        ) : (
          <p className="font-medium text-primary">
            {chosen.length}장을 고르셨습니다. 이대로 진행하셔도 괜찮습니다.
          </p>
        )}
      </div>

      {/* 고른 카드 */}
      {chosen.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-primary">
              고른 카드 ({chosen.length}장)
            </h3>
            <p className="text-sm text-muted-foreground">눌러서 뺄 수 있습니다</p>
          </div>
          <div className={gridClass}>
            {chosen.map((value) => (
              <ValueCard
                key={value.id}
                value={value}
                isSelected={true}
                variant="minimal"
                onClick={() => onToggle(value.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* 보류한 카드 */}
      {maybes.length > 0 && (
        <section>
          <h3 className="text-lg font-bold text-foreground mb-3">
            글쎄요에 두신 카드 ({maybes.length}장)
          </h3>
          <div className={gridClass}>
            {maybes.map((value) => (
              <ValueCard
                key={value.id}
                value={value}
                isSelected={false}
                variant="minimal"
                onClick={() => onToggle(value.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* 나머지 — 접어 둔다 */}
      {restByCategory.length > 0 && (
        <section>
          <button
            type="button"
            onClick={() => setRestOpen((open) => !open)}
            aria-expanded={restOpen}
            className="flex items-center gap-2 min-h-[44px] text-lg font-bold text-foreground"
          >
            <ChevronDown
              className={cn("w-5 h-5 transition-transform", restOpen && "rotate-180")}
            />
            나머지 카드 다시 보기
          </button>

          {restOpen && (
            <div className="mt-4 space-y-6">
              {restByCategory.map(([category, list]) => (
                <div key={category}>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2">
                    {category}
                  </h4>
                  <div className={gridClass}>
                    {list.map((value) => (
                      <ValueCard
                        key={value.id}
                        value={value}
                        isSelected={false}
                        variant="minimal"
                        onClick={() => onToggle(value.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 다음 단계 */}
      <div className="flex justify-center pt-2">
        {/*
          과다 상태에서는 이 버튼이 기본값이 아니다. 기본 행동은 그리드에서 카드를 빼는 것이고,
          이 버튼은 장수를 적은 채 열려 있는 출구다.
        */}
        <Button
          size="lg"
          variant={overCeil ? "ghost" : "default"}
          onClick={onConfirm}
          disabled={need > 0}
          className="min-h-[48px] px-8"
        >
          {overCeil ? `${chosen.length}장 그대로 2단계로 가기` : "다음 단계로"}
        </Button>
      </div>
    </div>
  );
}
