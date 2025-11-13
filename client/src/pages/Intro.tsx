import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Compass, Heart, Lightbulb, Target } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function Intro() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");

  const handleStart = () => {
    // 이메일 유효성 검증
    if (!email || !email.includes("@")) {
      toast.error("올바른 이메일 주소를 입력해주세요.");
      return;
    }

    // 이메일을 로컬 스토리지에 저장
    localStorage.setItem("values-email", email);
    
    setLocation("/sort");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
      <div className="container max-w-4xl">
        <div className="text-center space-y-6 mb-12">
          {/* 로고 아이콘 */}
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <Compass className="w-12 h-12 text-primary" />
            </div>
          </div>

          {/* 제목 */}
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground">
              코치의 나침반
            </h1>
            <p className="text-xl text-muted-foreground">
              가치 발견 카드 소팅
            </p>
          </div>

          {/* 설명 */}
          <p className="text-lg text-foreground/80 max-w-2xl mx-auto leading-relaxed">
            당신의 삶을 이끄는 핵심 가치를 발견하세요.
            <br />
            80개의 가치 카드를 4단계로 좁혀가며, 진정으로 중요한 것을 찾아갑니다.
          </p>
        </div>

        {/* 특징 카드 */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card>
            <CardHeader>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <Target className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-lg">4단계 프로세스</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                80개 → 20개 → 10개 → 5개 → 3개로 점진적으로 좁혀가며 핵심 가치를 발견합니다.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <Heart className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-lg">한국인 맞춤</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                효도, 정, 의리 등 한국 문화에 특화된 18개 가치를 포함한 80개 가치 목록.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <Lightbulb className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-lg">즉시 활용</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                결과를 PDF로 다운로드하여 코칭 세션, 개인 성찰, 팀 워크숍에 활용하세요.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* 이메일 입력 및 시작 버튼 */}
        <div className="max-w-md mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-center">시작하기</CardTitle>
              <CardDescription className="text-center">
                결과를 저장하고 이메일로 받아보려면 이메일 주소를 입력해주세요.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">이메일 주소</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleStart();
                    }
                  }}
                />
              </div>
              <Button
                size="lg"
                onClick={handleStart}
                className="w-full text-lg py-6 h-auto"
              >
                가치 발견 시작하기
              </Button>
            </CardContent>
          </Card>
          
          <p className="text-sm text-muted-foreground text-center">
            소요 시간: 약 10-15분
          </p>
        </div>

        {/* 푸터 정보 */}
        <div className="mt-16 text-center text-sm text-muted-foreground">
          <p>전문코치과정 · 가치 발견 그룹코칭 프로그램</p>
        </div>
      </div>
    </div>
  );
}
