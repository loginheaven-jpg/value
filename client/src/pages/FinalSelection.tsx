import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

interface Value {
  id: number;
  korean: string;
  english: string;
  description: string;
}

interface PairwiseResult {
  value: Value;
  wins: number;
}

const RANK_ICONS = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
const RANK_LABELS = ['1위', '2위', '3위', '4위', '5위'];

export default function FinalSelection() {
  const [, setLocation] = useLocation();
  const [sortedResults, setSortedResults] = useState<PairwiseResult[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    // localStorage에서 쌍대비교 결과 로드
    const saved = localStorage.getItem('pairwise-results');
    if (!saved) {
      setLocation('/step4');
      return;
    }

    const parsed: PairwiseResult[] = JSON.parse(saved);
    if (parsed.length !== 5) {
      setLocation('/step4');
      return;
    }

    setSortedResults(parsed);
  }, [setLocation]);

  const toggleSelection = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      if (newSelected.size >= 3) {
        toast.error('최대 3개까지만 선택할 수 있습니다');
        return;
      }
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleNext = () => {
    if (selectedIds.size !== 3) {
      toast.error('정확히 3개의 가치를 선택해주세요');
      return;
    }

    // 선택한 3개를 localStorage에 저장
    const finalValues = sortedResults
      .filter(r => selectedIds.has(r.value.id))
      .map(r => r.value);

    localStorage.setItem('values-final', JSON.stringify(finalValues));
    localStorage.removeItem('pairwise-results');
    setLocation('/result');
  };

  const handleBack = () => {
    setLocation('/step4');
  };

  if (sortedResults.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
      <div className="container max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-4">
            <Trophy className="w-5 h-5" />
            <span className="font-semibold">우선순위 결과</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            최종 3개의 가치를 선택하세요
          </h1>
          <p className="text-slate-600 mb-2">
            아래는 여러분의 선택을 바탕으로 정렬된 순위입니다
          </p>
          <p className="text-sm text-slate-500">
            순위는 참고용이며, 최종 3개는 자유롭게 선택하실 수 있습니다
          </p>
        </div>

        {/* 선택 카운터 */}
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 bg-white px-6 py-3 rounded-lg shadow-sm border">
            <span className="text-slate-600">선택한 가치:</span>
            <span className={`text-2xl font-bold ${selectedIds.size === 3 ? 'text-green-600' : 'text-primary'}`}>
              {selectedIds.size} / 3
            </span>
          </div>
        </div>

        {/* 정렬된 카드 목록 */}
        <div className="space-y-4 mb-8">
          {sortedResults.map((result, index) => {
            const isSelected = selectedIds.has(result.value.id);
            return (
              <Card
                key={result.value.id}
                className={`cursor-pointer transition-all ${
                  isSelected
                    ? 'border-2 border-primary shadow-lg scale-[1.02]'
                    : 'border hover:border-primary/50 hover:shadow-md'
                }`}
                onClick={() => toggleSelection(result.value.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-3xl">{RANK_ICONS[index]}</span>
                        <div>
                          <CardTitle className="text-2xl font-bold text-slate-900">
                            {result.value.korean}
                          </CardTitle>
                          <CardDescription className="text-base">
                            {result.value.english}
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-sm font-semibold text-slate-600">
                        {RANK_LABELS[index]}
                      </span>
                      <span className="text-xs text-slate-500">
                        {result.wins}회 선택
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-700 leading-relaxed">
                    {result.value.description}
                  </p>
                  {isSelected && (
                    <div className="mt-3 flex items-center gap-2 text-primary font-semibold">
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                      <span>선택됨</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* 하단 버튼 */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            size="lg"
            onClick={handleBack}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            이전 단계
          </Button>
          <Button
            size="lg"
            onClick={handleNext}
            disabled={selectedIds.size !== 3}
            className="gap-2"
          >
            결과 보기
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
