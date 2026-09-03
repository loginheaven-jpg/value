import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

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

export default function PairwiseComparison() {
  const [, setLocation] = useLocation();
  const [values, setValues] = useState<Value[]>([]);
  const [pairs, setPairs] = useState<[Value, Value][]>([]);
  const [currentPairIndex, setCurrentPairIndex] = useState(0);
  const [results, setResults] = useState<Map<number, number>>(new Map());

  useEffect(() => {
    // localStorage에서 5개 카드 로드
    const saved = localStorage.getItem('values-step3');
    if (!saved) {
      setLocation('/sort');
      return;
    }

    const parsed: Value[] = JSON.parse(saved);
    if (parsed.length !== 5) {
      setLocation('/sort');
      return;
    }

    setValues(parsed);

    // 모든 쌍 생성 (C(5,2) = 10)
    const allPairs: [Value, Value][] = [];
    for (let i = 0; i < parsed.length; i++) {
      for (let j = i + 1; j < parsed.length; j++) {
        allPairs.push([parsed[i], parsed[j]]);
      }
    }
    setPairs(allPairs);

    // 초기 승리 횟수 0으로 설정
    const initialResults = new Map<number, number>();
    parsed.forEach(v => initialResults.set(v.id, 0));
    setResults(initialResults);

    // localStorage에서 이전 진행 상황 복원
    const savedProgress = localStorage.getItem('pairwise-progress');
    if (savedProgress) {
      const { currentIndex, winCounts } = JSON.parse(savedProgress);
      setCurrentPairIndex(currentIndex);
      setResults(new Map(Object.entries(winCounts).map(([k, v]) => [Number(k), v as number])));
    }
  }, [setLocation]);

  const handleChoice = (chosenValue: Value) => {
    // 선택한 카드의 승리 횟수 증가
    const newResults = new Map(results);
    newResults.set(chosenValue.id, (newResults.get(chosenValue.id) || 0) + 1);
    setResults(newResults);

    const nextIndex = currentPairIndex + 1;

    // 진행 상황 저장
    localStorage.setItem('pairwise-progress', JSON.stringify({
      currentIndex: nextIndex,
      winCounts: Object.fromEntries(newResults)
    }));

    if (nextIndex >= pairs.length) {
      // 모든 비교 완료 - 정렬하여 저장
      const sortedValues = values
        .map(v => ({ value: v, wins: newResults.get(v.id) || 0 }))
        .sort((a, b) => {
          if (b.wins !== a.wins) return b.wins - a.wins;
          // 동점일 경우 원래 순서 유지 (id 기준)
          return a.value.id - b.value.id;
        });

      localStorage.setItem('pairwise-results', JSON.stringify(sortedValues));
      localStorage.removeItem('pairwise-progress');
      setLocation('/step5');
    } else {
      setCurrentPairIndex(nextIndex);
    }
  };

  const handleBack = () => {
    if (currentPairIndex > 0) {
      // 이전 비교로 돌아가기
      const prevIndex = currentPairIndex - 1;
      const prevPair = pairs[prevIndex];
      
      // 마지막 선택을 취소하기 위해 두 카드 중 하나의 승리 횟수를 감소
      // (어느 카드가 선택되었는지 추적하지 않으므로, 단순히 인덱스만 되돌림)
      setCurrentPairIndex(prevIndex);
      
      localStorage.setItem('pairwise-progress', JSON.stringify({
        currentIndex: prevIndex,
        winCounts: Object.fromEntries(results)
      }));
    } else {
      // 첫 비교에서 뒤로가기 = Step3으로
      localStorage.removeItem('pairwise-progress');
      setLocation('/sort');
    }
  };

  if (pairs.length === 0 || currentPairIndex >= pairs.length) {
    return null;
  }

  const [valueA, valueB] = pairs[currentPairIndex];
  const progress = ((currentPairIndex) / pairs.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
      <div className="container max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            두 가지 중 하나를 선택한다면?
          </h1>
          <p className="text-slate-600 mb-4">
            머리가 아닌 가슴으로, 직관적으로 선택해주세요. 정답은 없습니다.
          </p>
          <div className="max-w-md mx-auto">
            <div className="flex justify-between text-sm text-slate-600 mb-2">
              <span>{currentPairIndex} / {pairs.length}</span>
              <span>{Math.round(progress)}% 완료</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>

        {/* 비교 카드 - 반응형 (데스크톱: 좌우, 모바일: 상하) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* 카드 A */}
          <Card 
            className="cursor-pointer hover:shadow-xl transition-all hover:scale-105 border-2 hover:border-primary"
            onClick={() => handleChoice(valueA)}
          >
            <CardHeader className="pb-4">
              <CardTitle className="text-3xl font-bold text-primary">
                {valueA.korean}
              </CardTitle>
              <CardDescription className="text-lg text-slate-600">
                {valueA.english}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700 text-lg leading-relaxed">
                {valueA.description}
              </p>
            </CardContent>
          </Card>

          {/* 카드 B */}
          <Card 
            className="cursor-pointer hover:shadow-xl transition-all hover:scale-105 border-2 hover:border-primary"
            onClick={() => handleChoice(valueB)}
          >
            <CardHeader className="pb-4">
              <CardTitle className="text-3xl font-bold text-primary">
                {valueB.korean}
              </CardTitle>
              <CardDescription className="text-lg text-slate-600">
                {valueB.english}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700 text-lg leading-relaxed">
                {valueB.description}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 하단 버튼 */}
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="lg"
            onClick={handleBack}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            이전 비교
          </Button>
        </div>
      </div>
    </div>
  );
}
