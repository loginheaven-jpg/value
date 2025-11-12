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
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

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
      toast.info("PDF를 생성하는 중...");

      // html2canvas와 jsPDF 동적 import
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      // PDF로 변환할 영역
      const element = document.getElementById("result-container");
      if (!element) {
        throw new Error("결과 영역을 찾을 수 없습니다.");
      }

      // HTML을 캔버스로 변환
      const canvas = await html2canvas(element, {
        scale: 2, // 고해상도
        backgroundColor: "#ffffff",
        logging: false,
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

      toast.success("PDF가 다운로드되었습니다!");
    } catch (error) {
      console.error("PDF generation failed:", error);
      toast.error("PDF 생성에 실패했습니다.");
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
        <div id="result-container" className="max-w-4xl mx-auto space-y-8 bg-background p-8 rounded-lg">
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

          {/* 날짜 */}
          <div className="text-center text-sm text-muted-foreground">
            <p>{new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}</p>
            <p className="mt-2">전문코치과정 · 가치 발견 그룹코칭 프로그램</p>
          </div>
        </div>

        {/* 액션 버튼들 - PDF 영역 밖 */}
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
          <Card className="bg-muted/50 mt-8">
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
          <div className="text-center text-sm text-muted-foreground pt-8 border-t mt-8">
            <p>© 2025 Coach's Compass</p>
          </div>
        </div>
      </div>
    </div>
  );
}
