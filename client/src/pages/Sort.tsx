import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ProgressBar";
import { ValueCard } from "@/components/ValueCard";
import { Step, STEP_CONFIGS, Value } from "@/types/values";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function Sort() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [allValues, setAllValues] = useState<Value[]>([]);
  const [availableValues, setAvailableValues] = useState<Value[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

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
    const saved = localStorage.getItem("values-progress");
    if (saved) {
      try {
        const { step, selectedIds: savedIds } = JSON.parse(saved);
        setCurrentStep(step);
        setSelectedIds(new Set(savedIds));
      } catch (e) {
        console.error("Failed to restore progress:", e);
      }
    }
  }, []);

  // 진행 상황 저장
  useEffect(() => {
    if (allValues.length > 0) {
      localStorage.setItem(
        "values-progress",
        JSON.stringify({
          step: currentStep,
          selectedIds: Array.from(selectedIds),
        })
      );
    }
  }, [currentStep, selectedIds, allValues]);

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
      localStorage.setItem("final-values", JSON.stringify(finalValues));
      setLocation("/result");
    } else {
      // 다음 단계로
      const nextStep = (currentStep + 1) as Step;
      setCurrentStep(nextStep);
      const nextAvailable = allValues.filter((v) => selectedIds.has(v.id));
      setAvailableValues(nextAvailable);
      setSelectedIds(new Set());
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleBack = () => {
    if (currentStep === 1) {
      setLocation("/");
    } else {
      toast.info("처음부터 다시 시작하시겠습니까?");
    }
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
    <div className="min-h-screen bg-background">
      {/* Sticky 헤더 */}
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b shadow-sm">
        <div className="container py-4 space-y-4">
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
                ✓ 모든 카드를 선택했습니다! 다음 단계로 진행하세요.
              </p>
            </div>
          </div>
        )}

        {/* 네비게이션 버튼 */}
        <div className="max-w-3xl mx-auto flex justify-between items-center mt-8 pt-6 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {currentStep === 1 ? "처음으로" : "이전"}
          </Button>

          <Button
            onClick={handleNext}
            disabled={!canProceed}
            className="gap-2"
            size="lg"
          >
            {currentStep === 4 ? "결과 보기" : "다음 단계"}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </main>
    </div>
  );
}
