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
import { Download, Home, RotateCcw, Mail, ChevronDown, ChevronUp } from "lucide-react";
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
    "용기를 내야 했던 순간은 언제였나요?",
    "용기가 당신의 삶을 어떻게 변화시켰나요?"
  ],
  "인내": [
    "인내가 필요했던 상황에서 어떻게 극복했나요?",
    "인내를 통해 얻은 것은 무엇인가요?"
  ],
  "친절": [
    "최근 누군가에게 친절을 베푼 경험은 무엇인가요?",
    "친절을 베풀 때 어떤 느낌이 드나요?"
  ],
  "겸손": [
    "겸손이 당신의 관계에 어떤 영향을 미치나요?",
    "겸손을 실천하기 위해 어떤 노력을 하나요?"
  ],
  "양심": [
    "양심에 따라 행동한 경험은 무엇인가요?",
    "양심이 당신의 결정에 어떤 영향을 미치나요?"
  ],
  
  // 웰빙 관련 가치
  "건강": [
    "건강을 위해 지금 실천하고 있는 것은 무엇인가요?",
    "건강이 당신의 삶에 어떤 의미인가요?"
  ],
  "평온": [
    "평온을 느끼는 순간은 언제인가요?",
    "평온을 유지하기 위해 어떤 노력을 하나요?"
  ],
  "균형": [
    "삶의 균형을 위해 어떤 선택을 하고 있나요?",
    "균형이 깨졌을 때 어떻게 회복하나요?"
  ],
  "행복": [
    "행복을 느끼는 순간은 언제인가요?",
    "행복을 위해 지금 하고 있는 일은 무엇인가요?"
  ],
  
  // 영성 관련 가치
  "신앙": [
    "신앙이 당신의 삶에 어떤 의미인가요?",
    "신앙을 통해 얻은 힘은 무엇인가요?"
  ],
  "사명": [
    "당신의 사명은 무엇이라고 생각하나요?",
    "사명을 실현하기 위해 어떤 노력을 하고 있나요?"
  ],
  
  // 사회 관련 가치
  "정의": [
    "정의를 위해 행동한 경험은 무엇인가요?",
    "정의가 당신의 삶에 어떤 의미인가요?"
  ],
  "공정성": [
    "공정성을 실천하기 위해 어떤 노력을 하나요?",
    "공정하지 않은 상황에서 어떻게 대응하나요?"
  ],
  "봉사": [
    "봉사를 통해 얻은 보람은 무엇인가요?",
    "봉사가 당신의 삶에 어떤 의미인가요?"
  ],
  "환경": [
    "환경을 위해 실천하고 있는 것은 무엇인가요?",
    "환경 보호가 당신에게 어떤 의미인가요?"
  ],
  
  // 한국 특화 가치
  "효도": [
    "효도를 실천하기 위해 어떤 노력을 하고 있나요?",
    "효도가 당신의 삶에 어떤 의미인가요?"
  ],
  "예의": [
    "예의를 지키는 것이 당신에게 어떤 의미인가요?",
    "예의를 통해 얻은 것은 무엇인가요?"
  ],
  "정": [
    "정을 나누는 관계가 당신에게 어떤 의미인가요?",
    "정을 느끼는 순간은 언제인가요?"
  ],
  
  // 기타 가치
  "자유": [
    "자유가 당신의 삶에서 어떻게 나타나나요?",
    "자유를 위해 어떤 선택을 했나요?"
  ],
  "독립": [
    "독립적으로 살아가기 위해 어떤 노력을 하나요?",
    "독립이 당신에게 어떤 의미인가요?"
  ],
  "나다움": [
    "나다움을 지키기 위해 어떤 노력을 하나요?",
    "나답게 산다는 것이 당신에게 어떤 의미인가요?"
  ],
  "존엄": [
    "존엄을 지키기 위해 어떤 선택을 했나요?",
    "존엄이 당신의 삶에 어떤 의미인가요?"
  ],
  "원칙": [
    "당신의 원칙은 무엇인가요?",
    "원칙을 지키기 위해 어떤 희생을 한 적이 있나요?"
  ],
  "솔직함": [
    "솔직함을 실천하기 위해 어떤 노력을 하나요?",
    "솔직함이 당신의 관계에 어떤 영향을 미치나요?"
  ],
  "책임감": [
    "책임감을 느끼는 순간은 언제인가요?",
    "책임을 다하기 위해 어떤 노력을 하나요?"
  ],
  "성실": [
    "성실함을 실천하기 위해 어떤 노력을 하나요?",
    "성실함이 당신의 삶에 어떤 변화를 가져왔나요?"
  ],
  "근면": [
    "근면함을 실천하기 위해 어떤 노력을 하나요?",
    "근면함이 당신에게 어떤 의미인가요?"
  ],
  "자부심": [
    "자부심을 느끼는 순간은 언제인가요?",
    "자부심이 당신의 삶에 어떤 영향을 미치나요?"
  ],
  "체면": [
    "체면을 지키는 것이 당신에게 어떤 의미인가요?",
    "체면과 진정성 사이에서 어떻게 균형을 맞추나요?"
  ],
  "명예": [
    "명예가 당신의 삶에서 어떤 의미인가요?",
    "명예를 지키기 위해 어떤 노력을 하나요?"
  ],
  "충성": [
    "충성을 다하는 대상은 누구/무엇인가요?",
    "충성이 당신에게 어떤 의미인가요?"
  ],
  "존중": [
    "타인을 존중하기 위해 어떤 노력을 하나요?",
    "존중받을 때 어떤 느낌이 드나요?"
  ],
  "조화": [
    "조화를 이루기 위해 어떤 노력을 하나요?",
    "조화가 당신의 삶에 어떤 의미인가요?"
  ],
  "경청": [
    "경청을 실천하기 위해 어떤 노력을 하나요?",
    "경청을 통해 얻은 것은 무엇인가요?"
  ],
  "평판": [
    "평판이 당신의 삶에서 어떤 의미인가요?",
    "평판을 관리하기 위해 어떤 노력을 하나요?"
  ],
  
  // 기본 질문 (매칭되지 않는 가치용)
  "default": [
    "이 가치가 당신의 삶에서 구체적으로 어떻게 나타나나요?",
    "이 가치를 실천하기 위해 어떤 노력을 하고 있나요?"
  ]
};

export default function Result() {
  const [, setLocation] = useLocation();
  const [finalValues, setFinalValues] = useState<Value[]>([]);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  const [showRestartDialog, setShowRestartDialog] = useState(false);
  const [showHomeDialog, setShowHomeDialog] = useState(false);

  // tRPC mutation
  const saveValuesMutation = trpc.values.save.useMutation();

  useEffect(() => {
    const saved = localStorage.getItem("final-values");
    if (saved) {
      try {
        const values = JSON.parse(saved);
        setFinalValues(values);
        
        // 자동 DB 저장
        const name = localStorage.getItem("values-name");
        const email = localStorage.getItem("values-email");
        
        if (name && email && values.length === 3) {
          saveValuesMutation.mutate({
            name,
            email,
            value1: values[0].korean,
            value2: values[1].korean,
            value3: values[2].korean,
          }, {
            onSuccess: () => {
              console.log("Results auto-saved to database");
            },
            onError: (error) => {
              console.error("Failed to auto-save results:", error);
            }
          });
        }
      } catch (e) {
        console.error("Failed to load final values:", e);
        setLocation("/");
      }
    } else {
      setLocation("/");
    }
  }, [setLocation]);

  const handleDownloadPDF = async () => {
    try {
      setIsGeneratingPDF(true);
      toast.info("PDF를 생성하는 중입니다. 잠시만 기다려주세요...");

      // html2canvas와 jsPDF 동적 import
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      // PDF로 변환할 영역
      const element = document.getElementById("result-container");
      if (!element) {
        throw new Error("결과 영역을 찾을 수 없습니다.");
      }

      // 성찰 질문 영역 임시 숨김
      const reflectionSections = document.querySelectorAll(".reflection-section");
      reflectionSections.forEach((section) => {
        (section as HTMLElement).style.display = "none";
      });

      // OKLCH 색상을 RGB로 임시 변환
      const originalStyles = new Map<Element, string>();
      const allElements = element.querySelectorAll("*");
      
      allElements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        const computedStyle = window.getComputedStyle(htmlEl);
        
        // 배경색 변환
        const bgColor = computedStyle.backgroundColor;
        if (bgColor && bgColor.includes("oklch")) {
          originalStyles.set(el, htmlEl.style.backgroundColor);
          htmlEl.style.backgroundColor = bgColor;
        }
        
        // 텍스트 색상 변환
        const textColor = computedStyle.color;
        if (textColor && textColor.includes("oklch")) {
          if (!originalStyles.has(el)) {
            originalStyles.set(el, htmlEl.style.color);
          }
          htmlEl.style.color = textColor;
        }
      });

      // Canvas로 변환 (고해상도)
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: "#ffffff",
        logging: false,
        useCORS: true,
      });

      // 원래 스타일 복원
      originalStyles.forEach((originalValue, el) => {
        (el as HTMLElement).style.cssText = originalValue;
      });

      // 성찰 질문 영역 다시 표시
      reflectionSections.forEach((section) => {
        (section as HTMLElement).style.display = "";
      });

      // PDF 생성
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      
      const name = localStorage.getItem("values-name") || "참가자";
      pdf.save(`${name}_가치발견결과.pdf`);

      toast.success("PDF가 성공적으로 다운로드되었습니다!");
    } catch (error) {
      console.error("PDF generation failed:", error);
      toast.error("PDF 생성에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleRestart = () => {
    setShowRestartDialog(true);
  };

  const confirmRestart = () => {
    localStorage.removeItem("values-progress");
    localStorage.removeItem("final-values");
    localStorage.removeItem("values-name");
    localStorage.removeItem("values-email");
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
    setLocation("/");
  };

  const handleSendEmail = async () => {
    toast.info("이메일 발송 기능은 곧 추가될 예정입니다!");
    // TODO: 이메일 발송 기능 구현
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
      <div className="container py-12">
        {/* PDF 생성 영역 - RGB 색상 사용 */}
        <div 
          id="result-container" 
          className="max-w-4xl mx-auto space-y-8 p-8 rounded-lg"
          style={{
            backgroundColor: '#ffffff',
            color: '#1a1a1a',
          }}
        >
          {/* 축하 메시지 */}
          <div className="text-center space-y-4">
            <div className="inline-block px-4 py-2 rounded-full" style={{ backgroundColor: '#e0f2fe' }}>
              <span style={{ color: '#0369a1', fontWeight: 600 }}>🎉 완료!</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold" style={{ color: '#1a1a1a' }}>
              {name}님의 핵심 가치
            </h1>
            <p className="text-lg" style={{ color: '#6b7280' }}>
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
                      <div className="reflection-section mt-6 pt-6 border-t space-y-4">
                        <div className="space-y-3">
                          {questions.map((question, qIndex) => (
                            <div key={qIndex} className="flex gap-3">
                              <span className="text-primary font-semibold shrink-0">Q{qIndex + 1}.</span>
                              <p className="text-foreground/80">{question}</p>
                            </div>
                          ))}
                        </div>
                        <p className="text-sm text-muted-foreground italic mt-4">
                          💡 이 질문들을 워크북에 기록하거나, 코칭 세션에서 파트너와 함께 탐색해보세요.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* 액션 버튼들 */}
        <div className="max-w-4xl mx-auto mt-8">
          <div className="flex flex-wrap gap-4 justify-center">
            <Button
              size="lg"
              onClick={handleSendEmail}
              className="gap-2"
            >
              <Mail className="w-5 h-5" />
              이메일 발송
            </Button>

            <Button
              size="lg"
              variant="outline"
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
              className="gap-2"
            >
              <Download className="w-5 h-5" />
              {isGeneratingPDF ? "생성 중..." : "PDF 다운로드"}
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

            <Button
              size="lg"
              variant="ghost"
              onClick={handleHome}
              className="gap-2"
            >
              <Home className="w-5 h-5" />
              처음으로
            </Button>
          </div>

          {/* 활용 안내 */}
          <Card className="bg-muted/50 mt-8">
            <CardContent className="p-6 space-y-3 text-sm text-foreground/80">
              <h3 className="font-bold text-lg text-foreground mb-4">💡 이제 무엇을 할까요?</h3>
              <p>
                <strong>1. 성찰하기:</strong> 위의 화살표를 클릭하여 각 가치에 대한 성찰 질문을 탐색해보세요.
              </p>
              <p>
                <strong>2. 실천하기:</strong> 이 가치들을 일상의 결정과 행동에 적용해보세요.
              </p>
              <p>
                <strong>3. 공유하기:</strong> 코칭 세션이나 팀 워크숍에서 당신의 가치를 나누세요.
              </p>
              <p>
                <strong>4. 재검토하기:</strong> 6개월마다 다시 해보며 가치의 변화를 확인하세요.
              </p>
            </CardContent>
          </Card>

          {/* 푸터 */}
          <div className="text-center text-sm text-muted-foreground pt-8 border-t mt-8">
            <p>© 2025 Coach's Compass · 가치 발견 그룹코칭 프로그램</p>
          </div>
        </div>
      </div>

      {/* 다시 시작 확인 다이얼로그 */}
      <AlertDialog open={showRestartDialog} onOpenChange={setShowRestartDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>정말 다시 시작하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              현재 결과가 삭제되고 처음부터 다시 시작됩니다. 
              이 작업은 되돌릴 수 없습니다.
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
              현재 결과가 삭제되고 시작 페이지로 이동합니다. 
              이 작업은 되돌릴 수 없습니다.
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
