import { cn } from "@/lib/utils";
import { Value } from "@/types/values";
import { Check } from "lucide-react";

interface ValueCardProps {
  value: Value;
  isSelected: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export function ValueCard({ value, isSelected, onClick, disabled }: ValueCardProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative w-full p-4 rounded-lg border-2 transition-all duration-200",
        "hover:shadow-md active:scale-[0.98]",
        "text-left group",
        isSelected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border bg-card hover:border-primary/50",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      {/* 선택 표시 */}
      {isSelected && (
        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
          <Check className="w-4 h-4 text-primary-foreground" />
        </div>
      )}

      {/* 한글명 */}
      <div className="text-lg font-bold text-foreground mb-1 pr-8">
        {value.korean}
      </div>

      {/* 영문명 */}
      <div className="text-sm text-muted-foreground mb-2">
        {value.english}
      </div>

      {/* 설명 */}
      <div className="text-sm text-foreground/80 leading-relaxed">
        {value.description}
      </div>

      {/* 카테고리 태그 */}
      <div className="mt-3 inline-block">
        <span className="text-xs px-2 py-1 rounded-full bg-accent/20 text-accent-foreground">
          #{value.category}
        </span>
      </div>
    </button>
  );
}
