import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Value } from "@/types/values";
import { Home, RotateCcw, Copy, ChevronDown, ChevronUp, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

// 가치별 성찰 질문 매핑 (세미나 스크립트 기반)
const REFLECTION_QUESTIONS: Record<string, string[]> = {
  // 관계 관련 가치
  "가족": [
    "가족과의 관계에서 이 가치가 어떻게 나타나나요?",
    "가족을 위해 최근에 어떤 선택을 했나요?"
  ],
  "사랑": [
    "사랑이 당신의 삶에서 구체적으로 어떻게 표현되나요?",
    "사랑을 주고받을 때 어떤 느낌이 드나요?"
  ],
  "우정": [
    "친구와의 관계에서 이 가치가 어떻게 실현되고 있나요?",
    "우정을 지키기 위해 어떤 노력을 하고 있나요?"
  ],
  "신뢰": [
    "누구를 가장 신뢰하며, 그 이유는 무엇인가요?",
    "신뢰가 깨진 경험이 있다면, 어떻게 회복했나요?"
  ],
  "배려": [
    "최근 타인을 배려한 구체적인 행동은 무엇이었나요?",
    "배려할 때 어떤 보람을 느끼나요?"
  ],
  "의리": [
    "의리를 지키기 위해 어떤 희생을 한 적이 있나요?",
    "이 가치가 당신의 관계에 어떤 영향을 미치나요?"
  ],
  
  // 성장 관련 가치
  "성장": [
    "최근 어떤 영역에서 성장을 경험했나요?",
    "성장을 위해 지금 도전하고 있는 것은 무엇인가요?"
  ],
  "도전": [
    "최근 어떤 어려운 일에 도전했나요?",
    "도전할 때 어떤 감정을 느끼나요?"
  ],
  "교육": [
    "배움이 당신의 삶에서 어떤 의미를 가지나요?",
    "최근 가장 의미 있었던 배움은 무엇인가요?"
  ],
  "창의성": [
    "창의성을 발휘할 때 어떤 느낌이 드나요?",
    "당신의 창의성이 가장 빛났던 순간은 언제인가요?"
  ],
  "지혜": [
    "어떤 경험을 통해 지혜를 얻었나요?",
    "지혜를 나누는 것이 당신에게 어떤 의미인가요?"
  ],
  "자기계발": [
    "자기계발을 위해 지금 하고 있는 일은 무엇인가요?",
    "자기계발이 당신의 삶에 어떤 변화를 가져왔나요?"
  ],
  
  // 성취 관련 가치
  "성공": [
    "성공이 당신에게 어떤 의미인가요?",
    "가장 자랑스러운 성공 경험은 무엇인가요?"
  ],
  "탁월함": [
    "탁월함을 추구할 때 어떤 감정을 느끼나요?",
    "탁월함을 위해 어떤 노력을 하고 있나요?"
  ],
  "인정": [
    "타인의 인정이 당신에게 어떤 의미인가요?",
    "인정받았을 때 어떤 느낌이 드나요?"
  ],
  "전문성": [
    "전문성을 키우기 위해 어떤 노력을 하고 있나요?",
    "전문가로 인정받을 때 어떤 보람을 느끼나요?"
  ],
  "리더십": [
    "리더십을 발휘할 때 어떤 가치를 중시하나요?",
    "리더로서 가장 보람있었던 순간은 언제인가요?"
  ],
  "영향력": [
    "타인에게 긍정적인 영향을 미친 경험은 무엇인가요?",
    "영향력을 행사할 때 어떤 책임감을 느끼나요?"
  ],
  
  // 덕목 관련 가치
  "용기": [
    "용기를 발휘했던 순간은 언제인가요?",
    "용기가 필요한 상황에서 어떻게 대처하나요?"
  ],
  "인내": [
    "인내가 필요했던 경험은 무엇인가요?",
    "인내를 통해 얻은 것은 무엇인가요?"
  ],
  "친절": [
    "타인에게 친절을 베풀 때 어떤 느낌이 드나요?",
    "친절이 당신의 삶에 어떤 영향을 미치나요?"
  ],
  "겸손": [
    "겸손이 당신에게 어떤 의미인가요?",
    "겸손을 실천하기 위해 어떤 노력을 하나요?"
  ],
  "양심": [
    "양심에 따라 행동한 경험은 무엇인가요?",
    "양심이 당신의 결정에 어떤 영향을 미치나요?"
  ],
  "존엄": [
    "존엄이 지켜졌을 때 어떤 느낌이 드나요?",
    "타인의 존엄을 존중하기 위해 어떤 노력을 하나요?"
  ],
  
  // 웰빙 관련 가치
  "건강": [
    "건강을 위해 지금 하고 있는 일은 무엇인가요?",
    "건강이 당신의 삶에 어떤 영향을 미치나요?"
  ],
  "평온": [
    "평온을 느끼는 순간은 언제인가요?",
    "평온을 유지하기 위해 어떤 노력을 하나요?"
  ],
  "균형": [
    "삶의 균형을 유지하기 위해 어떤 노력을 하나요?",
    "균형이 깨졌을 때 어떻게 회복하나요?"
  ],
  "행복": [
    "행복을 느끼는 순간은 언제인가요?",
    "행복을 위해 지금 하고 있는 일은 무엇인가요?"
  ],
  "자유": [
    "자유가 당신에게 어떤 의미인가요?",
    "자유를 누릴 때 어떤 느낌이 드나요?"
  ],
  "안전": [
    "안전이 당신에게 어떤 의미인가요?",
    "안전을 지키기 위해 어떤 노력을 하나요?"
  ],
  "재미": [
    "재미를 느끼는 활동은 무엇인가요?",
    "재미가 당신의 삶에 어떤 영향을 미치나요?"
  ],
  
  // 기타 가치
  "정의": [
    "정의가 당신에게 어떤 의미인가요?",
    "정의를 실현하기 위해 어떤 노력을 하나요?"
  ],
  "공정성": [
    "공정성이 지켜지지 않을 때 어떤 감정을 느끼나요?",
    "공정성을 위해 어떤 노력을 하나요?"
  ],
  "정": [
    "정이 당신의 관계에 어떤 영향을 미치나요?",
    "정을 나누는 것이 어떤 의미인가요?"
  ],
  "효도": [
    "효도가 당신에게 어떤 의미인가요?",
    "효도를 실천하기 위해 어떤 노력을 하나요?"
  ],
  "예의": [
    "예의가 당신의 관계에 어떤 영향을 미치나요?",
    "예의를 지키기 위해 어떤 노력을 하나요?"
  ],
  "명예": [
    "명예가 당신에게 어떤 의미인가요?",
    "명예를 지키기 위해 어떤 노력을 하나요?"
  ],
  "충성": [
    "충성이 당신에게 어떤 의미인가요?",
    "충성을 지키기 위해 어떤 노력을 하나요?"
  ],
  "조화": [
    "조화를 이루기 위해 어떤 노력을 하나요?",
    "조화가 깨졌을 때 어떻게 회복하나요?"
  ],
  "경청": [
    "경청이 당신의 관계에 어떤 영향을 미치나요?",
    "경청을 실천하기 위해 어떤 노력을 하나요?"
  ],
  "평판": [
    "평판이 당신에게 어떤 의미인가요?",
    "평판을 관리하기 위해 어떤 노력을 하나요?"
  ],
  "책임감": [
    "책임감이 당신의 삶에 어떤 영향을 미치나요?",
    "책임을 다하기 위해 어떤 노력을 하나요?"
  ],
  "근면": [
    "근면이 당신에게 어떤 의미인가요?",
    "근면을 실천하기 위해 어떤 노력을 하나요?"
  ],
  "자부심": [
    "자부심을 느끼는 순간은 언제인가요?",
    "자부심이 당신의 삶에 어떤 영향을 미치나요?"
  ],
  "체면": [
    "체면이 당신에게 어떤 의미인가요?",
    "체면을 지키기 위해 어떤 노력을 하나요?"
  ],
  "사명": [
    "사명이 당신에게 어떤 의미인가요?",
    "사명을 실현하기 위해 어떤 노력을 하나요?"
  ],
  "나다움": [
    "나다움이 당신에게 어떤 의미인가요?",
    "나답게 살기 위해 어떤 노력을 하나요?"
  ],
  "솔직함": [
    "솔직함이 당신의 관계에 어떤 영향을 미치나요?",
    "솔직함을 실천하기 위해 어떤 노력을 하나요?"
  ],
  "원칙": [
    "원칙이 당신에게 어떤 의미인가요?",
    "원칙을 지키기 위해 어떤 노력을 하나요?"
  ],
  
  // 기본 질문 (매핑되지 않은 가치용)
  "default": [
    "이 가치가 당신의 삶에서 어떻게 나타나나요?",
    "이 가치를 실천하기 위해 어떤 노력을 하고 있나요?"
  ]
};

export default function Result() {
  const [, setLocation] = useLocation();
  const [finalValues, setFinalValues] = useState<Value[]>([]);

  const [showRestartDialog, setShowRestartDialog] = useState(false);
  const [showHomeDialog, setShowHomeDialog] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  
  // 슈퍼어드민 체크 (viproject@naver.com)
  const storedEmail = localStorage.getItem("values-email");
  const isSuperAdmin = storedEmail === "viproject@naver.com";

  // tRPC mutation
  const saveAssessment = trpc.values.save.useMutation();

  useEffect(() => {
    const saved = localStorage.getItem("values-final");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFinalValues(parsed);

        // 결과 페이지 진입 시 자동 DB 저장 (한 번만)
        const savedFlag = sessionStorage.getItem("values-saved-to-db");
        if (!savedFlag) {
          const name = localStorage.getItem("values-name");
          const email = localStorage.getItem("values-email");

          if (name && email && parsed.length === 3) {
            saveAssessment.mutate({
              name,
              email,
              value1: parsed[0].korean,
              value2: parsed[1].korean,
              value3: parsed[2].korean,
            }, {
              onSuccess: () => {
                sessionStorage.setItem("values-saved-to-db", "true");
                console.log("결과가 자동으로 저장되었습니다.");
              },
              onError: (error) => {
                console.error("저장 실패:", error);
              },
            });
          }
        }
      } catch (e) {
        console.error("Failed to parse final values:", e);
        setLocation("/");
      }
    } else {
      setLocation("/");
    }
  }, [setLocation, saveAssessment]);

  const handleCopyValues = () => {
    const name = localStorage.getItem("values-name") || "참가자";
    const text = `${name}님의 핵심 가치

${finalValues.map((v, i) => `${i + 1}. ${v.korean} (${v.english})`).join("\n")}

코치의 나침반 · Value Discovery
${new Date().toLocaleDateString("ko-KR")}`;

    navigator.clipboard.writeText(text);
    toast.success("가치 목록이 클립보드에 복사되었습니다!");
  };

  const handleRestart = () => {
    setShowRestartDialog(true);
  };

  const confirmRestart = () => {
    localStorage.removeItem("values-progress");
    localStorage.removeItem("final-values");
    localStorage.removeItem("values-name");
    localStorage.removeItem("values-email");
    sessionStorage.removeItem("values-saved-to-db");
    setLocation("/");
    toast.success("처음부터 다시 시작합니다.");
  };

  const handleHome = () => {
    setShowHomeDialog(true);
  };

  const confirmHome = () => {
    localStorage.removeItem("values-progress");
    localStorage.removeItem("final-values");
    localStorage.removeItem("values-name");
    localStorage.removeItem("values-email");
    sessionStorage.removeItem("values-saved-to-db");
    setLocation("/");
  };



  const toggleCard = (id: number) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedCards(newExpanded);
  };

  const getReflectionQuestions = (korean: string): string[] => {
    return REFLECTION_QUESTIONS[korean] || REFLECTION_QUESTIONS["default"];
  };

  if (finalValues.length === 0) {
    return null;
  }

  const name = localStorage.getItem("values-name") || "참가자";

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* 슈퍼어드민 링크 */}
      {isSuperAdmin && (
        <div className="fixed top-4 right-4 z-50">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation("/admin")}
            className="gap-2 bg-background/80 backdrop-blur-sm"
          >
            <Settings className="w-4 h-4" />
            관리자메뉴
          </Button>
        </div>
      )}
      <div className="container py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* 축하 메시지 */}
          <div className="text-center space-y-4">
            <div className="inline-block px-4 py-2 rounded-full bg-primary/10">
              <span className="text-primary font-semibold">🎉 완료!</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold">
              {name}님의 핵심 가치
            </h1>
            <p className="text-lg text-muted-foreground">
              이 세 가지 가치가 당신의 삶을 이끄는 나침반입니다.
            </p>
          </div>

          {/* 성찰 질문 카드들 */}
          <div className="space-y-4">
            {finalValues.map((value, index) => {
              const isExpanded = expandedCards.has(value.id);
              const questions = getReflectionQuestions(value.korean);

              return (
                <Card key={value.id} className="overflow-hidden">
                  <CardContent className="p-6">
                    {/* 가치 정보 (한글 + 영문 + 설명 가로 배치) */}
                    <div 
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => toggleCard(value.id)}
                    >
                      <div className="flex-1">
                        <div className="flex items-baseline gap-3 mb-2">
                          <span className="text-2xl font-bold text-primary">
                            {index + 1}. {value.korean}
                          </span>
                          <span className="text-lg text-muted-foreground">
                            {value.english}
                          </span>
                        </div>
                        <p className="text-sm text-foreground/70">
                          {value.description}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-4"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </Button>
                    </div>

                    {/* 성찰 질문 (확장 시 표시) */}
                    {isExpanded && (
                      <div className="mt-6 p-4 bg-muted/50 rounded-lg space-y-3 reflection-section">
                        <p className="font-semibold text-foreground flex items-center gap-2">
                          <span>💭</span>
                          <span>성찰 질문</span>
                        </p>
                        {questions.map((question, qIndex) => (
                          <p key={qIndex} className="text-sm text-foreground/80 pl-6">
                            {qIndex + 1}. {question}
                          </p>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* 활용 안내 */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <span>💡</span>
                <span>이 결과를 어떻게 활용하나요?</span>
              </h3>
              <ul className="space-y-2 text-sm text-foreground/80">
                <li>• <strong>워크북 기록</strong>: 각 가치에 대한 성찰 질문에 답하며 깊이 있게 탐구하세요.</li>
                <li>• <strong>코칭 세션</strong>: 코치와 함께 이 가치들이 삶의 결정에 어떻게 영향을 미치는지 논의하세요.</li>
                <li>• <strong>목표 설정</strong>: 이 가치들을 중심으로 인생 목표와 우선순위를 재정립하세요.</li>
                <li>• <strong>정기적 점검</strong>: 6개월마다 이 진단을 다시 해보며 가치의 변화를 확인하세요.</li>
              </ul>
            </CardContent>
          </Card>

          {/* 액션 버튼 */}
          <div className="flex flex-wrap gap-4 justify-center">
            <Button
              size="lg"
              onClick={handleCopyValues}
              className="gap-2"
            >
              <Copy className="w-5 h-5" />
              복사하기
            </Button>

            <Button
              size="lg"
              variant="outline"
              onClick={handleHome}
              className="gap-2"
            >
              <Home className="w-5 h-5" />
              처음으로
            </Button>

            <Button
              size="lg"
              variant="outline"
              onClick={handleRestart}
              className="gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              다시 시작
            </Button>
          </div>
        </div>
      </div>

      {/* 다시 시작 확인 다이얼로그 */}
      <AlertDialog open={showRestartDialog} onOpenChange={setShowRestartDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>다시 시작하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              현재 진행 상황과 결과가 모두 삭제됩니다. 이 작업은 취소할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRestart}>
              확인
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 처음으로 확인 다이얼로그 */}
      <AlertDialog open={showHomeDialog} onOpenChange={setShowHomeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>처음으로 돌아가시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              현재 진행 상황과 결과가 모두 삭제됩니다. 이 작업은 취소할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={confirmHome}>
              확인
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
