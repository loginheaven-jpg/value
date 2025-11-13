import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ProgressBar";
import { ValueCard } from "@/components/ValueCard";
import { Step, STEP_CONFIGS, Value } from "@/types/values";
import { ArrowLeft, ArrowRight, Home, Settings } from "lucide-react";
import { useEffect, useState } from "react";
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

export default function Sort() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [allValues, setAllValues] = useState<Value[]>([]);
  const [availableValues, setAvailableValues] = useState<Value[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [stepHistory, setStepHistory] = useState<Array<{ step: Step; values: Value[]; selected: Set<number> }>>([]);
  const [loading, setLoading] = useState(true);
  const [restored, setRestored] = useState(false);
  
  // 슈퍼어드민 체크 (viproject@naver.com)
  const storedEmail = localStorage.getItem("values-email");
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

    if (currentStep === 4) {
      // 최종 결과 페이지로 이동
      const finalValues = allValues.filter((v) => selectedIds.has(v.id));
      localStorage.setItem("values-final", JSON.stringify(finalValues));
      // 진행 상황 삭제 (완료했으므로)
      localStorage.removeItem("values-progress");
      setLocation("/result");
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
              {config.instruction}
            </p>
            <div className="flex items-center justify-center gap-4 text-sm">
              <span className="text-foreground font-medium">
                선택됨: <span className="text-primary text-lg font-bold">{selectedIds.size}</span> / {config.to}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="container py-6">
        {/* 선택된 카드 영역 */}
        {selectedValues.length > 0 && (
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
        {unselectedValues.length > 0 && (
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
              {unselectedValues.map((value) => (
                <ValueCard
                  key={value.id}
                  value={value}
                  isSelected={false}
                  onClick={() => handleCardClick(value.id)}
                  disabled={selectedIds.size >= config.to}
                />
              ))}
            </div>
          </div>
        )}

        {/* 모두 선택한 경우 안내 */}
        {unselectedValues.length === 0 && selectedValues.length > 0 && (
          <div className="text-center py-8">
            <div className="inline-block px-6 py-3 bg-primary/10 rounded-lg">
              <p className="text-primary font-semibold">
                ✓ 모든 카드를 선택했습니다! 우측 하단 버튼을 눌러 다음 단계로 진행하세요.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Floating 버튼 영역 */}
      <div className="fixed bottom-6 right-6 z-30 flex flex-col gap-3">
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
