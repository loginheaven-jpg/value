import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Value } from "@/types/values";
import { Download, Home, RotateCcw, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function Result() {
  const [, setLocation] = useLocation();
  const [finalValues, setFinalValues] = useState<Value[]>([]);

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
      // jsPDF 동적 import
      const { jsPDF } = await import("jspdf");
      
      // 한글 폰트 지원을 위한 설정 (추후 개선 가능)
      const doc = new jsPDF();
      
      // 제목
      doc.setFontSize(20);
      doc.text("My Core Values", 105, 20, { align: "center" });
      
      doc.setFontSize(16);
      doc.text("Coach's Compass: Value Discovery", 105, 30, { align: "center" });
      
      // 날짜
      doc.setFontSize(10);
      const today = new Date().toLocaleDateString("ko-KR");
      doc.text(today, 105, 40, { align: "center" });
      
      // 가치 목록
      let yPos = 60;
      finalValues.forEach((value, index) => {
        doc.setFontSize(14);
        doc.text(`${index + 1}. ${value.korean} (${value.english})`, 20, yPos);
        
        doc.setFontSize(10);
        doc.text(value.description, 25, yPos + 7);
        
        doc.setFontSize(9);
        doc.text(`Category: ${value.category}`, 25, yPos + 14);
        
        yPos += 30;
      });
      
      // 푸터
      doc.setFontSize(8);
      doc.text("Professional Coach Program - Value Discovery Group Coaching", 105, 280, { align: "center" });
      
      // PDF 저장
      doc.save(`my-core-values-${Date.now()}.pdf`);
      toast.success("PDF가 다운로드되었습니다!");
    } catch (error) {
      console.error("PDF generation failed:", error);
      toast.error("PDF 생성에 실패했습니다.");
    }
  };

  const handleRestart = () => {
    localStorage.removeItem("values-progress");
    localStorage.removeItem("final-values");
    setLocation("/");
    toast.success("처음부터 다시 시작합니다.");
  };

  const handleShare = () => {
    const text = `나의 핵심 가치:\n${finalValues.map((v, i) => `${i + 1}. ${v.korean} (${v.english})`).join("\n")}`;
    
    if (navigator.share) {
      navigator.share({
        title: "나의 핵심 가치",
        text: text,
      }).catch(() => {
        // 공유 취소 시 무시
      });
    } else {
      navigator.clipboard.writeText(text);
      toast.success("클립보드에 복사되었습니다!");
    }
  };

  if (finalValues.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* 축하 메시지 */}
          <div className="text-center space-y-4">
            <div className="inline-block px-4 py-2 bg-primary/10 rounded-full">
              <span className="text-primary font-semibold">🎉 완료!</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              당신의 핵심 가치를 발견했습니다
            </h1>
            <p className="text-lg text-muted-foreground">
              이 세 가지 가치가 당신의 삶을 이끄는 나침반입니다.
            </p>
          </div>

          {/* 가치 카드들 */}
          <div className="grid gap-6">
            {finalValues.map((value, index) => (
              <Card key={value.id} className="border-2">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                          {index + 1}
                        </div>
                        <div>
                          <CardTitle className="text-2xl">{value.korean}</CardTitle>
                          <CardDescription className="text-base">{value.english}</CardDescription>
                        </div>
                      </div>
                    </div>
                    <span className="text-xs px-3 py-1 rounded-full bg-accent/20 text-accent-foreground">
                      #{value.category}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground/80 text-lg leading-relaxed">
                    {value.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 액션 버튼들 */}
          <div className="flex flex-wrap gap-4 justify-center">
            <Button
              size="lg"
              onClick={handleDownloadPDF}
              className="gap-2"
            >
              <Download className="w-5 h-5" />
              PDF 다운로드
            </Button>

            <Button
              size="lg"
              variant="outline"
              onClick={handleShare}
              className="gap-2"
            >
              <Share2 className="w-5 h-5" />
              공유하기
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
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-lg">💡 이제 무엇을 할까요?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-foreground/80">
              <p>
                <strong>1. 성찰하기:</strong> 각 가치가 당신의 삶에서 어떻게 나타나는지 생각해보세요.
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
          <div className="text-center text-sm text-muted-foreground pt-8 border-t">
            <p>전문코치과정 · 가치 발견 그룹코칭 프로그램</p>
            <p className="mt-2">© 2025 Coach's Compass</p>
          </div>
        </div>
      </div>
    </div>
  );
}
