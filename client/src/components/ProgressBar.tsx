import { Step, STEP_CONFIGS } from "@/types/values";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  currentStep: Step;
}

export function ProgressBar({ currentStep }: ProgressBarProps) {
  const totalSteps = 4; // 1~4단계 (5는 결과 페이지)
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="w-full space-y-2">
      {/* 진행률 바 */}
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 단계 표시 */}
      <div className="flex justify-between items-center">
        {STEP_CONFIGS.slice(0, 4).map((config) => (
          <div
            key={config.step}
            className={cn(
              "flex items-center gap-2",
              config.step <= currentStep ? "text-primary" : "text-muted-foreground"
            )}
          >
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors",
                config.step < currentStep && "bg-primary text-primary-foreground",
                config.step === currentStep && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                config.step > currentStep && "bg-muted text-muted-foreground"
              )}
            >
              {config.step}
            </div>
            <span className="text-xs font-medium hidden sm:inline">
              {config.to}개
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
