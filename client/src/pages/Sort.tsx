import { Button } from "@/components/ui/button";
import { CardTriage, TriageRerunPrompt, TriageReview } from "@/components/CardTriage";
import { ProgressBar } from "@/components/ProgressBar";
import { ValueCard } from "@/components/ValueCard";
import {
  buildTriageQueue,
  decideCard,
  resolveTriageOutcome,
  routeAfterRound,
  sanitizeTriage,
  startRerun,
  triageFromLegacyProgress,
  undoDecision,
  Step,
  STEP_CONFIGS,
  TriageBucket,
  TriageState,
  TRIAGE_CEIL,
  TRIAGE_FLOOR,
  Value,
} from "@/types/values";
import { cn } from "@/lib/utils";
import { ArrowLeft, ArrowRight, Home, Settings } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

interface SavedProgress {
  step: Step;
  selectedIds: number[];
  availableValueIds: number[];
  stepHistory: Array<{
    step: Step;
    valueIds: number[];
    selectedIds: number[];
  }>;
  timestamp: number;
}

/**
 * 1단계 화면의 세 국면.
 *   sorting — 카드를 한 장씩 넘기는 중
 *   review  — 고른 카드를 검토·보충하는 중 (하한 미달이거나 2단계에서 되돌아왔을 때)
 *   rerun   — 24장을 넘겨 한 번 더 나눌지 묻는 중
 */
type TriagePhase = "sorting" | "review" | "rerun";

interface SavedTriage extends TriageState {
  phase: TriagePhase;
}

export default function Sort() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [allValues, setAllValues] = useState<Value[]>([]);
  const [availableValues, setAvailableValues] = useState<Value[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [stepHistory, setStepHistory] = useState<Array<{ step: Step; values: Value[]; selected: Set<number> }>>([]);
  const [loading, setLoading] = useState(true);
  const [restored, setRestored] = useState(false);
  const [triage, setTriage] = useState<TriageState | null>(null);
  const [triagePhase, setTriagePhase] = useState<TriagePhase>("sorting");
  
  // 슈퍼어드민 체크 (viproject@naver.com)
  const storedEmail = localStorage.getItem("user-email");
  const isSuperAdmin = storedEmail === "viproject@naver.com";

  // 가치 데이터 로드
  useEffect(() => {
    fetch("/values.json")
      .then((res) => res.json())
      .then((data: Value[]) => {
        setAllValues(data);
        setAvailableValues(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Failed to load values:", error);
        toast.error("가치 데이터를 불러오는데 실패했습니다.");
        setLoading(false);
      });
  }, []);

  // 로컬 스토리지에서 진행 상황 복원
  useEffect(() => {
    if (allValues.length === 0 || restored) return;

    const saved = localStorage.getItem("values-progress");
    if (saved) {
      try {
        const progress: SavedProgress = JSON.parse(saved);
        
        // 24시간 이내 데이터만 복원
        const hoursSinceLastSave = (Date.now() - progress.timestamp) / (1000 * 60 * 60);
        if (hoursSinceLastSave > 24) {
          localStorage.removeItem("values-progress");
          localStorage.removeItem("values-triage");
          toast.info("저장된 진행 상황이 만료되어 처음부터 시작합니다.");
          setRestored(true);
          return;
        }

        // 단계 복원
        setCurrentStep(progress.step);

        // availableValues 복원
        const restoredAvailable = allValues.filter(v => 
          progress.availableValueIds.includes(v.id)
        );
        setAvailableValues(restoredAvailable);

        // 선택된 ID 복원
        setSelectedIds(new Set(progress.selectedIds));

        // 히스토리 복원
        const restoredHistory = progress.stepHistory.map(h => ({
          step: h.step,
          values: allValues.filter(v => h.valueIds.includes(v.id)),
          selected: new Set(h.selectedIds)
        }));
        setStepHistory(restoredHistory);

        setRestored(true);
        toast.success(`저장된 진행 상황을 불러왔습니다. (${progress.step}단계)`);
      } catch (e) {
        console.error("Failed to restore progress:", e);
        localStorage.removeItem("values-progress");
        toast.error("저장된 데이터를 불러오는데 실패했습니다. 처음부터 시작합니다.");
        setRestored(true);
      }
    } else {
      setRestored(true);
    }
  }, [allValues, restored]);

  // 1단계 분류 상태 복원 — 없으면 결정론 순서로 큐를 만든다
  useEffect(() => {
    if (allValues.length === 0 || !restored || triage) return;

    const knownIds = allValues.map((v) => v.id);

    const saved = localStorage.getItem("values-triage");
    if (saved) {
      try {
        const parsed: SavedTriage = JSON.parse(saved);
        const hoursSinceLastSave = (Date.now() - parsed.timestamp) / (1000 * 60 * 60);
        if (hoursSinceLastSave <= 24 && Array.isArray(parsed.queueIds) && parsed.decisions) {
          // 지금 없는 id 를 판단·큐·이력 전부에서 걷어낸다. queueIds 만 거르면 게이트가 세는
          // 장수와 2단계가 받는 장수가 어긋나 잠긴 화면이 된다.
          //
          // timestamp 를 다시 찍는 이유: values-progress 는 페이지를 열기만 해도 갱신되는데
          // 이쪽만 분류를 만져야 갱신되면, progress 는 신선하고 triage 만 만료되어 1단계
          // 판단이 통째로 사라진다. 두 저장본의 시계를 맞춘다.
          setTriage({ ...sanitizeTriage(parsed, knownIds), timestamp: Date.now() });
          setTriagePhase(parsed.phase ?? "sorting");
          return;
        }
      } catch (e) {
        console.error("Failed to restore triage:", e);
      }
      localStorage.removeItem("values-triage");
    }

    // 분류 상태가 없는데 이미 2단계 이상이다 — 분류 도입 이전에 저장된 진행 상태다.
    // 빈 분류를 새로 만들면 '이전 단계'에서 고른 카드가 0장으로 보인다. 이력에서 되살린다.
    if (currentStep > 1) {
      const step1 = stepHistory.find((h) => h.step === 1);
      if (step1) {
        setTriage(
          triageFromLegacyProgress(
            step1.values.map((v) => v.id),
            Array.from(step1.selected),
            Date.now()
          )
        );
        setTriagePhase("review");
        return;
      }
    }

    setTriage({
      round: 1,
      queueIds: buildTriageQueue(allValues),
      decisions: {},
      history: [],
      timestamp: Date.now(),
    });
  }, [allValues, restored, triage, currentStep, stepHistory]);

  // 큐가 빈 채로 sorting 에 머무는 상태는 정상 경로로는 생기지 않는다. 그래도 저장본이
  // 어긋나면 빈 화면이 되므로 검토 화면으로 되돌린다.
  useEffect(() => {
    if (!triage) return;
    if (currentStep === 1 && triagePhase === "sorting" && triage.queueIds.length === 0) {
      setTriagePhase("review");
    }
  }, [triage, triagePhase, currentStep]);

  // 1단계 분류 상태 저장
  useEffect(() => {
    if (!triage) return;
    const payload: SavedTriage = { ...triage, phase: triagePhase };
    localStorage.setItem("values-triage", JSON.stringify(payload));
  }, [triage, triagePhase]);

  // 진행 상황 저장
  useEffect(() => {
    if (allValues.length === 0 || !restored) return;

    const progress: SavedProgress = {
      step: currentStep,
      selectedIds: Array.from(selectedIds),
      availableValueIds: availableValues.map(v => v.id),
      stepHistory: stepHistory.map(h => ({
        step: h.step,
        valueIds: h.values.map(v => v.id),
        selectedIds: Array.from(h.selected)
      })),
      timestamp: Date.now()
    };

    localStorage.setItem("values-progress", JSON.stringify(progress));
  }, [currentStep, selectedIds, availableValues, stepHistory, allValues, restored]);

  const config = STEP_CONFIGS[currentStep - 1];
  const canProceed = selectedIds.size === config.to;
  const isTriage = currentStep === 1;

  // 카드를 내보내는 정본 순서. yes 목록도 이 순서를 따라 뽑아 화면마다 순서가 달라지지 않게 한다.
  const triageOrder = useMemo(() => buildTriageQueue(allValues), [allValues]);
  const triageYesIds = useMemo(
    () => (triage ? triageOrder.filter((id) => triage.decisions[id] === "yes") : []),
    [triage, triageOrder]
  );
  const triageNeed = Math.max(0, TRIAGE_FLOOR - triageYesIds.length);
  const currentTriageValue = triage
    ? allValues.find((v) => v.id === triage.queueIds[0])
    : undefined;

  const proceedToStep2 = (valueIds: number[]) => {
    const chosen = allValues.filter((v) => valueIds.includes(v.id));
    // 1단계를 히스토리에 남긴다 — 2단계의 '이전 단계'가 검토 화면으로 돌아오는 근거다.
    setStepHistory([...stepHistory, { step: 1, values: chosen, selected: new Set<number>() }]);
    setCurrentStep(2);
    setAvailableValues(chosen);
    setSelectedIds(new Set());
    setTriagePhase("sorting");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /** 한 라운드가 끝났다. 어느 화면으로 갈지는 `routeAfterRound` 가 정한다. */
  const applyTriageOutcome = (next: TriageState) => {
    const outcome = resolveTriageOutcome(next.decisions, next.round);
    const route = routeAfterRound(outcome);

    if (route === "step2" && outcome.action === "proceed") {
      setTriage(next);
      proceedToStep2(outcome.valueIds);
      return;
    }
    if (route === "rerun") {
      setTriage(next);
      setTriagePhase("rerun");
      return;
    }
    // 검토 화면에서 뺀 카드가 원래 있던 더미로 돌아가도록 진입 직전 상태를 남긴다.
    setTriage({ ...next, topUpOrigin: next.decisions });
    setTriagePhase("review");
  };

  const handleTriageDecide = (bucket: TriageBucket) => {
    if (!triage || triage.queueIds.length === 0) return;
    const next: TriageState = { ...decideCard(triage, bucket), timestamp: Date.now() };
    if (next.queueIds.length === 0) applyTriageOutcome(next);
    else setTriage(next);
  };

  const handleTriageUndo = () => {
    if (!triage) return;
    setTriage({ ...undoDecision(triage), timestamp: Date.now() });
  };

  const handleRerunAccept = () => {
    if (!triage) return;
    // yes 만 다시 큐에 올린다. no·maybe 판단은 라운드를 넘어 누적된다.
    setTriage({ ...startRerun(triage, triageOrder), timestamp: Date.now() });
    setTriagePhase("sorting");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /** 재분류 화면에서 '검토 화면에서 줄이기'. 과다 상태의 안전한 기본값이다. */
  const handleRerunReview = () => {
    if (!triage) return;
    setTriage({ ...triage, topUpOrigin: triage.decisions });
    setTriagePhase("review");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // 장수가 적힌 버튼을 눌러서 나가는 길. 막지 않는다 — 다만 기본값이 아니다.
  const handleRerunDecline = () => proceedToStep2(triageYesIds);

  const handleTriageToggle = (id: number) => {
    if (!triage) return;
    const decisions = { ...triage.decisions };
    if (decisions[id] === "yes") {
      const origin = triage.topUpOrigin?.[id];
      decisions[id] = origin && origin !== "yes" ? origin : "no";
    } else {
      decisions[id] = "yes";
    }
    setTriage({ ...triage, decisions, timestamp: Date.now() });
  };

  /**
   * 검토 화면의 확인. **하한만 지킨다.**
   *
   * 여기서 상한으로 되튕기면 '{n}장 그대로 2단계로 가기' 라벨이 거짓말이 된다 — 실제로는
   * 재분류 화면으로 돌아가 두 화면이 핑퐁한다. 상한은 이미 이 화면의 문구와 버튼 라벨로
   * 전달했고, 그것을 보고 누른 것이 이 클릭이다.
   *
   * 자동 진입(라운드 종료)에는 상한이 그대로 걸린다 — `routeAfterRound`.
   * 즉 24장을 넘겨 2단계로 가는 길은 **장수가 적힌 버튼을 누르는 것뿐**이다.
   *
   * 유령 id 가 섞여도 어긋나지 않도록 `triageYesIds`(실재 id)를 센다.
   */
  const handleTriageConfirm = () => {
    if (!triage || triageYesIds.length < TRIAGE_FLOOR) return;
    proceedToStep2(triageYesIds);
  };

  // 선택된 카드와 미선택 카드 분리
  const selectedValues = availableValues.filter((v) => selectedIds.has(v.id));
  const unselectedValues = availableValues.filter((v) => !selectedIds.has(v.id));

  const handleCardClick = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      if (newSelected.size < config.to) {
        newSelected.add(id);
      } else {
        toast.warning(`최대 ${config.to}개까지만 선택할 수 있습니다.`);
      }
    }
    setSelectedIds(newSelected);
  };

  const handleNext = () => {
    if (!canProceed) {
      toast.error(`정확히 ${config.to}개를 선택해주세요.`);
      return;
    }

    if (currentStep === 3) {
      // Step3 완료 - 5개 선택 완료, 쌍대비교 페이지로
      // availableValues 에서 선택된 것들을 가져온다
      const selectedValues = availableValues.filter((v) => selectedIds.has(v.id));
      localStorage.setItem("values-step3", JSON.stringify(selectedValues));
      // 진행 상황 삭제 (쌍대비교로 넘어가므로)
      localStorage.removeItem("values-progress");
      localStorage.removeItem("values-triage");
      setLocation("/step4");
    } else {
      // 현재 상태를 히스토리에 저장
      setStepHistory([...stepHistory, {
        step: currentStep,
        values: availableValues,
        selected: new Set(selectedIds)
      }]);

      // 다음 단계로
      const nextStep = (currentStep + 1) as Step;
      setCurrentStep(nextStep);
      const nextAvailable = allValues.filter((v) => selectedIds.has(v.id));
      
      setAvailableValues(nextAvailable);
      setSelectedIds(new Set());
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrevious = () => {
    if (stepHistory.length === 0) return;

    // 히스토리에서 이전 상태 복원
    const previous = stepHistory[stepHistory.length - 1];
    setCurrentStep(previous.step);
    // 1단계는 빈 큐로 되돌아간다. 그대로 두면 게이트가 다시 돌아 2단계로 튕겨 나간다.
    if (previous.step === 1) setTriagePhase("review");
    setAvailableValues(previous.values);
    setSelectedIds(previous.selected);
    setStepHistory(stepHistory.slice(0, -1));
    window.scrollTo({ top: 0, behavior: "smooth" });
    toast.info("이전 단계로 돌아갔습니다.");
  };

  const handleBack = () => {
    setLocation("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">가치 카드를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Sticky 헤더 */}
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b shadow-sm">
        <div className="container py-4 space-y-4">
          {/* 처음으로 버튼 - 헤더 좌측 상단 */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="gap-2"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">처음으로</span>
            </Button>
            
            <div className="flex items-center gap-2">
              {/* 자동 저장 안내 */}
              <div className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                💾 자동 저장됨
              </div>
              
              {/* 슈퍼어드민 링크 */}
              {isSuperAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation("/admin")}
                  className="gap-2"
                >
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">관리자메뉴</span>
                </Button>
              )}
            </div>
          </div>

          <ProgressBar currentStep={currentStep} />
          
          {/* 단계 안내 */}
          <div className="text-center space-y-2">
            <h2 className="text-xl md:text-2xl font-bold text-foreground">
              {config.title}
            </h2>
            <p className="text-sm md:text-base text-muted-foreground">
              {isTriage && triagePhase === "review"
                ? "고른 카드를 확인해 주세요. 더하거나 빼실 수 있습니다."
                : isTriage && triagePhase === "rerun"
                  ? "고르신 카드가 조금 많습니다."
                  : config.instruction}
            </p>
            {/* 1단계에는 목표 개수가 없다. 분류 화면이 제 진행 상황을 스스로 보여준다. */}
            {!isTriage && (
              <div className="flex items-center justify-center gap-4 text-sm">
                <span className="text-foreground font-medium">
                  선택됨: <span className="text-primary text-2xl font-bold">{selectedIds.size}</span> / {config.to}
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="container py-6">
        {/* 1단계 — 한 장씩 나누기 */}
        {isTriage && triage && (
          <>
            {triagePhase === "sorting" && currentTriageValue && (
              <CardTriage
                value={currentTriageValue}
                position={triage.history.length + 1}
                total={triage.history.length + triage.queueIds.length}
                round={triage.round}
                yesCount={triageYesIds.length}
                canUndo={triage.history.length > 0}
                onDecide={handleTriageDecide}
                onUndo={handleTriageUndo}
              />
            )}

            {triagePhase === "rerun" && (
              <TriageRerunPrompt
                yesCount={triageYesIds.length}
                message="이 카드들만 한 번 더 나눠 볼까요? 그대로 진행하셔도 괜찮습니다."
                onReview={handleRerunReview}
                onAccept={handleRerunAccept}
                onDecline={handleRerunDecline}
              />
            )}

            {triagePhase === "review" && (
              <TriageReview
                allValues={allValues}
                decisions={triage.decisions}
                yesIds={triageYesIds}
                need={triageNeed}
                overCeil={triageYesIds.length > TRIAGE_CEIL}
                onToggle={handleTriageToggle}
                onConfirm={handleTriageConfirm}
              />
            )}
          </>
        )}

        {/* 선택된 카드 영역 */}
        {!isTriage && selectedValues.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-primary">
                ✓ 선택한 가치 ({selectedValues.length}개)
              </h3>
              <p className="text-sm text-muted-foreground">
                카드를 다시 클릭하면 선택 해제됩니다
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4 bg-primary/5 rounded-lg border-2 border-primary/20">
              {selectedValues.map((value) => (
                <ValueCard
                  key={value.id}
                  value={value}
                  isSelected={true}
                  onClick={() => handleCardClick(value.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* 미선택 카드 영역 */}
        {!isTriage && unselectedValues.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-foreground">
                선택 가능한 가치 ({unselectedValues.length}개)
              </h3>
              {selectedIds.size < config.to && (
                <p className="text-sm text-accent-foreground bg-accent/20 px-3 py-1 rounded-full">
                  {config.to - selectedIds.size}개 더 선택하세요
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {unselectedValues.map((value) => {
                return (
                  <ValueCard
                    key={value.id}
                    value={value}
                    isSelected={false}
                    onClick={() => handleCardClick(value.id)}
                    disabled={selectedIds.size >= config.to}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* 모두 선택한 경우 안내 */}
        {!isTriage && unselectedValues.length === 0 && selectedValues.length > 0 && (
          <div className="text-center py-8">
            <div className="inline-block px-6 py-3 bg-primary/10 rounded-lg">
              <p className="text-primary font-semibold">
                ✓ 모든 카드를 선택했습니다! 우측 하단 버튼을 눌러 다음 단계로 진행하세요.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Floating 버튼 영역 — 1단계는 화면이 제 버튼을 갖는다 */}
      <div className={cn("fixed bottom-6 right-6 z-30 flex-col gap-3", isTriage ? "hidden" : "flex")}>
        {/* 이전 단계 버튼 - 2단계부터 표시 */}
        {currentStep > 1 && (
          <Button
            onClick={handlePrevious}
            variant="outline"
            size="lg"
            className="gap-2 shadow-lg hover:shadow-xl transition-shadow bg-background"
          >
            <ArrowLeft className="w-5 h-5" />
            이전 단계
          </Button>
        )}

        {/* 다음 단계 버튼 - 선택 완료 시만 표시 */}
        {canProceed && (
          <Button
            onClick={handleNext}
            size="lg"
            className="gap-2 shadow-lg hover:shadow-xl transition-shadow"
          >
            {currentStep === 4 ? "결과 보기" : "다음 단계"}
            <ArrowRight className="w-5 h-5" />
          </Button>
        )}
      </div>
    </div>
  );
}
