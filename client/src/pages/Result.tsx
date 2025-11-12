import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Value } from "@/types/values";
import { Download, Home, RotateCcw, Copy, ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

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
    "창의성을 발휘할 때 가장 살아있다고 느끼는 순간은 언제인가요?",
    "창의적인 아이디어를 실현하기 위해 무엇을 하고 있나요?"
  ],
  "지혜": [
    "당신의 지혜는 어떤 경험에서 나왔나요?",
    "지혜를 나누고 싶은 사람이 있나요?"
  ],
  "자기계발": [
    "자기계발을 위해 현재 하고 있는 것은 무엇인가요?",
    "어떤 모습으로 성장하고 싶나요?"
  ],
  
  // 성취 관련 가치
  "성공": [
    "당신에게 성공이란 구체적으로 무엇을 의미하나요?",
    "가장 자랑스러운 성공 경험은 무엇인가요?"
  ],
  "성취": [
    "최근 이룬 성취 중 가장 의미 있는 것은 무엇인가요?",
    "다음으로 이루고 싶은 목표는 무엇인가요?"
  ],
  "탁월함": [
    "탁월함을 추구하는 영역은 어디인가요?",
    "탁월함을 위해 어떤 노력을 하고 있나요?"
  ],
  "인정": [
    "누구에게 인정받고 싶나요? 왜 그런가요?",
    "인정받았을 때 어떤 느낌이 드나요?"
  ],
  "자부심": [
    "무엇에 대해 가장 자부심을 느끼나요?",
    "자부심을 느끼는 순간은 언제인가요?"
  ],
  
  // 진실/덕목 관련 가치
  "나다움": [
    "어떤 순간에 가장 '나답다'고 느끼나요?",
    "나다움을 지키기 위해 포기한 것이 있나요?"
  ],
  "솔직함": [
    "솔직함이 당신의 관계에 어떤 영향을 미치나요?",
    "솔직하기 어려웠던 순간이 있었나요?"
  ],
  "원칙": [
    "당신이 절대 타협할 수 없는 원칙은 무엇인가요?",
    "원칙을 지키기 위해 어떤 희생을 한 적이 있나요?"
  ],
  "용기": [
    "최근 용기를 낸 경험은 무엇인가요?",
    "용기가 필요한 순간은 언제인가요?"
  ],
  "겸손": [
    "겸손이 당신의 성장에 어떻게 도움이 되나요?",
    "겸손을 실천하는 구체적인 방법은 무엇인가요?"
  ],
  
  // 영성/의미 관련 가치
  "사명": [
    "당신의 사명은 무엇이라고 생각하나요?",
    "사명을 실현하기 위해 무엇을 하고 있나요?"
  ],
  "목적": [
    "당신의 삶의 목적은 무엇인가요?",
    "목적을 발견한 순간은 언제였나요?"
  ],
  "의미": [
    "무엇이 당신의 삶을 의미 있게 만드나요?",
    "의미를 느끼는 순간은 언제인가요?"
  ],
  "영성": [
    "영성이 당신의 삶에서 어떤 역할을 하나요?",
    "영적 성장을 위해 무엇을 하고 있나요?"
  ],
  "믿음": [
    "무엇을 믿으며 살아가나요?",
    "믿음이 흔들린 적이 있었나요? 어떻게 극복했나요?"
  ],
  
  // 웰빙 관련 가치
  "건강": [
    "건강을 위해 현재 실천하고 있는 것은 무엇인가요?",
    "건강한 삶이 당신에게 왜 중요한가요?"
  ],
  "평온": [
    "평온을 느끼는 순간은 언제인가요?",
    "평온을 유지하기 위해 무엇을 하고 있나요?"
  ],
  "균형": [
    "삶의 균형이 잘 잡혀 있나요? (1-10점)",
    "균형을 위해 조정이 필요한 영역은 어디인가요?"
  ],
  "여유": [
    "여유를 즐기는 방법은 무엇인가요?",
    "여유가 당신의 삶에 어떤 영향을 미치나요?"
  ],
  
  // 자율/자유 관련 가치
  "자유": [
    "자유가 당신에게 구체적으로 무엇을 의미하나요?",
    "자유를 위해 포기한 것이 있나요?"
  ],
  "독립성": [
    "독립성이 당신의 삶에서 어떻게 나타나나요?",
    "독립성을 지키기 위해 무엇을 하고 있나요?"
  ],
  "자율성": [
    "스스로 결정할 수 있는 영역은 어디인가요?",
    "자율성이 제한될 때 어떤 감정이 드나요?"
  ],
  
  // 정의/공정 관련 가치
  "정의": [
    "당신이 가장 화나게 하는 불의는 무엇인가요?",
    "정의를 실현하기 위해 무엇을 하고 있나요?"
  ],
  "공정성": [
    "공정함이 당신의 결정에 어떤 영향을 미치나요?",
    "공정하지 못한 상황을 목격했을 때 어떻게 행동하나요?"
  ],
  "평등": [
    "평등을 실현하기 위해 어떤 노력을 하고 있나요?",
    "평등이 당신의 관계에 어떤 영향을 미치나요?"
  ],
  
  // 한국 특화 가치
  "효도": [
    "부모님을 공경하는 구체적인 방법은 무엇인가요?",
    "효도가 당신의 삶에서 어떤 의미를 가지나요?"
  ],
  "예의": [
    "예의를 지키는 것이 왜 중요한가요?",
    "예의가 당신의 관계에 어떤 영향을 미치나요?"
  ],
  "조화": [
    "조화를 추구하는 이유는 무엇인가요?",
    "갈등 상황에서 조화를 이루기 위해 어떻게 하나요?"
  ],
  "정": [
    "정이 당신의 관계에서 어떻게 나타나나요?",
    "정을 나누는 순간은 언제인가요?"
  ],
  
  // 기본 질문 (매핑되지 않은 가치용)
  "default": [
    "이 가치가 최근 당신의 삶에서 어떻게 나타났나요?",
    "이 가치를 더 실천하기 위해 무엇을 할 수 있나요?"
  ]
};

export default function Result() {
  const [, setLocation] = useLocation();
  const [finalValues, setFinalValues] = useState<Value[]>([]);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());

  useEffect(() => {
    const saved = localStorage.getItem("final-values");
    if (saved) {
      try {
        setFinalValues(JSON.parse(saved));
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

      // HTML을 캔버스로 변환
      const canvas = await html2canvas(element, {
        scale: 2, // 고해상도
        backgroundColor: "#ffffff",
        logging: false,
        useCORS: true,
      });

      // 성찰 질문 영역 다시 표시
      reflectionSections.forEach((section) => {
        (section as HTMLElement).style.display = "";
      });

      // 캔버스를 이미지로 변환
      const imgData = canvas.toDataURL("image/png");

      // PDF 생성
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // A4 크기에 맞게 이미지 크기 계산
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 10;

      pdf.addImage(
        imgData,
        "PNG",
        imgX,
        imgY,
        imgWidth * ratio,
        imgHeight * ratio
      );

      // PDF 저장
      const today = new Date().toISOString().split("T")[0];
      pdf.save(`my-core-values-${today}.pdf`);

      toast.success("PDF가 성공적으로 다운로드되었습니다!");
    } catch (error) {
      console.error("PDF generation failed:", error);
      toast.error("PDF 생성에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleRestart = () => {
    localStorage.removeItem("values-progress");
    localStorage.removeItem("final-values");
    setLocation("/");
    toast.success("처음부터 다시 시작합니다.");
  };

  const handleCopyToClipboard = async () => {
    const text = `나의 핵심 가치\n\n${finalValues.map((v, i) => `${i + 1}. ${v.korean} (${v.english})\n   ${v.description}`).join("\n\n")}`;
    
    try {
      await navigator.clipboard.writeText(text);
      toast.success("클립보드에 복사되었습니다! 원하는 곳에 붙여넣기 하세요.");
    } catch (error) {
      console.error("Failed to copy:", error);
      toast.error("복사에 실패했습니다.");
    }
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
              당신의 핵심 가치를 발견했습니다
            </h1>
            <p className="text-lg" style={{ color: '#6b7280' }}>
              이 세 가지 가치가 당신의 삶을 이끄는 나침반입니다.
            </p>
          </div>

          {/* 가치 카드들 */}
          <div className="grid gap-6">
            {finalValues.map((value, index) => (
              <div 
                key={value.id} 
                className="rounded-lg p-6"
                style={{
                  border: '2px solid #e5e7eb',
                  backgroundColor: '#ffffff',
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg"
                        style={{
                          backgroundColor: '#0369a1',
                          color: '#ffffff',
                        }}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold" style={{ color: '#1a1a1a' }}>
                          {value.korean}
                        </h3>
                        <p className="text-base" style={{ color: '#6b7280' }}>
                          {value.english}
                        </p>
                      </div>
                    </div>
                  </div>
                  <span 
                    className="text-xs px-3 py-1 rounded-full"
                    style={{
                      backgroundColor: '#f3f4f6',
                      color: '#4b5563',
                    }}
                  >
                    #{value.category}
                  </span>
                </div>
                <p className="text-lg leading-relaxed" style={{ color: '#4b5563' }}>
                  {value.description}
                </p>
              </div>
            ))}
          </div>

          {/* 날짜 */}
          <div className="text-center text-sm" style={{ color: '#9ca3af' }}>
            <p>{new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}</p>
            <p className="mt-2">전문코치과정 · 가치 발견 그룹코칭 프로그램</p>
          </div>
        </div>

        {/* 성찰 질문 영역 - PDF 영역 밖 */}
        <div className="max-w-4xl mx-auto mt-8 space-y-4">
          <h2 className="text-2xl font-bold text-center mb-6">💭 성찰 질문</h2>
          <p className="text-center text-muted-foreground mb-8">
            각 가치를 클릭하여 성찰 질문을 확인하고, 더 깊이 탐색해보세요.
          </p>

          {finalValues.map((value) => {
            const questions = getReflectionQuestions(value.korean);
            const isExpanded = expandedCards.has(value.id);

            return (
              <Card 
                key={value.id} 
                className="reflection-section cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => toggleCard(value.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                        {finalValues.indexOf(value) + 1}
                      </div>
                      <h3 className="text-xl font-bold">{value.korean}</h3>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>

                  {isExpanded && (
                    <div className="mt-6 space-y-4 pl-11">
                      {questions.map((question, idx) => (
                        <div key={idx} className="flex gap-3">
                          <span className="text-primary font-semibold shrink-0">Q{idx + 1}.</span>
                          <p className="text-foreground/80">{question}</p>
                        </div>
                      ))}
                      <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground italic">
                          💡 이 질문들을 워크북에 기록하거나, 코칭 세션에서 파트너와 함께 탐색해보세요.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* 액션 버튼들 */}
        <div className="max-w-4xl mx-auto mt-8">
          <div className="flex flex-wrap gap-4 justify-center">
            <Button
              size="lg"
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
              onClick={handleCopyToClipboard}
              className="gap-2"
            >
              <Copy className="w-5 h-5" />
              클립보드에 복사
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
              onClick={() => setLocation("/")}
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
                <strong>1. 성찰하기:</strong> 위의 성찰 질문을 통해 각 가치를 더 깊이 탐색해보세요.
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
    </div>
  );
}
