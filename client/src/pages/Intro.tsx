import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Compass, Heart, Lightbulb, Target, Settings, History } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

/**
 * 삭제 문의처(§6.1 C안 필수 항목).
 *
 * 이 도구는 세미나에서 진행자가 함께 있는 상태로 쓰인다. 지금 참인 경로는 진행자다.
 * 담당 부서 연락처가 정해지면 이 한 줄만 바꾼다 — 화면 여러 곳에 흩지 않는다.
 */
const PRIVACY_DELETION_CONTACT = "삭제를 원하시면 진행자에게 말씀해 주세요.";

export default function Intro() {
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  
  // localStorage에서 저장된 이메일/이름 복원 및 슈퍼어드민 체크
  useEffect(() => {
    const storedName = localStorage.getItem("user-name");
    const storedEmail = localStorage.getItem("user-email");
    
    if (storedName) setName(storedName);
    if (storedEmail) {
      setEmail(storedEmail);
      setIsSuperAdmin(storedEmail === "viproject@naver.com");
    }
  }, []);

  const handleStart = () => {
    // 이름 유효성 검증
    if (!name || name.trim().length === 0) {
      toast.error("이름을 입력해주세요.");
      return;
    }

    // 이메일 유효성 검증
    if (!email || !email.includes("@")) {
      toast.error("올바른 이메일 주소를 입력해주세요.");
      return;
    }

    // 이름과 이메일을 로컬 스토리지에 저장
    localStorage.setItem("user-name", name.trim());
    localStorage.setItem("user-email", email);
    
    setLocation("/sort");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
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
              Value Discovery
            </p>
          </div>

          {/* 설명 */}
          <p className="text-lg text-foreground/80 max-w-2xl mx-auto leading-relaxed">
            당신은 어떤 사람인가요? 무엇이 당신을 당신답게 만드나요?
            <br />
            72개의 가치 카드를 천천히 좁혀가며, 진짜 나를 발견하는 여정을 시작하세요.
          </p>
        </div>

        {/* 특징 카드 */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card>
            <CardHeader>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <Target className="w-6 h-6 text-primary" />
              </div>
              {/*
                "4단계 여정"은 과정을 감췄다. 끝이 보여야 첫 단계의 부담이 준다(§5.4).
                사다리를 그대로 보여주고, 첫 단계가 '고르기'가 아니라 '나누기'임을 밝힌다.
              */}
              <CardTitle className="text-base leading-relaxed">
                72장 → 끌리는 것만 → 10개 → 5개 → 3개
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                첫 단계는 고르는 게 아니라 나누는 일입니다. 3분이면 됩니다.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <Heart className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-lg">한국인의 마음</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                효도, 정, 의리 등 우리 문화에 뿌리내린 72개의 가치를 담았습니다.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <Lightbulb className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-lg">삶에 바로 적용</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                발견한 가치를 일상의 선택과 결정에 바로 활용할 수 있습니다.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* 이름 및 이메일 입력 */}
        <div className="max-w-md mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-center">시작하기</CardTitle>

            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">이름 *</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="홍길동"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleStart();
                      }
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">이메일 주소 *</Label>
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
              </div>
              {/*
                §6.1 C안 — 수집은 그대로 두되 안내를 붙인다. 원문이 요구한 세 가지를
                모두 적는다: 수집 목적 · 보관 기간 · 삭제 문의처.

                보관 기간을 '삭제를 요청하실 때까지'로 적은 것은 사실 그대로다. 자동 삭제
                로직이 없고 운영자가 지울 때까지 행이 남는다. 지키지 못할 기간을 적는 것보다
                지금 참인 문장을 적는다.
              */}
              <div className="rounded-lg bg-muted/50 px-4 py-3 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground/80">개인정보 수집 안내</p>
                <p>
                  진단 결과를 저장하고 본인이 다시 조회할 수 있도록 이름과 이메일을 받습니다.
                  세미나 진행자가 운영을 위해 결과를 확인합니다.
                </p>
                <p>삭제를 요청하실 때까지 보관합니다. {PRIVACY_DELETION_CONTACT}</p>
              </div>

              <Button
                size="lg"
                onClick={handleStart}
                className="w-full text-lg py-6 h-auto"
              >
                가치 발견 시작하기
              </Button>
              
              {email && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setLocation("/my-results")}
                  className="w-full gap-2 text-muted-foreground hover:text-foreground"
                >
                  <History className="w-4 h-4" />
                  이전 결과 보기
                </Button>
              )}
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
