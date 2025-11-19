import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Calendar, Plus, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

interface AssessmentResult {
  id: number;
  name: string;
  email: string;
  value1: string;
  value2: string;
  value3: string;
  createdAt: Date;
}

export default function MyResults() {
  const [, setLocation] = useLocation();
  const [userEmail, setUserEmail] = useState<string>("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    const email = localStorage.getItem("user-email");
    if (!email) {
      toast.error("로그인 정보가 없습니다. 먼저 진단을 시작해주세요.");
      setLocation("/");
      return;
    }
    setUserEmail(email);
  }, [setLocation]);

  const { data: results, isLoading, error } = trpc.values.getByEmail.useQuery(
    { email: userEmail },
    { enabled: !!userEmail }
  );

  const handleStartNew = () => {
    // 기존 진행 상황 삭제
    localStorage.removeItem("values-progress");
    localStorage.removeItem("values-step3");
    localStorage.removeItem("pairwise-progress");
    localStorage.removeItem("pairwise-results");
    localStorage.removeItem("values-final");
    setLocation("/sort");
  };

  const handleBack = () => {
    setLocation("/");
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">결과를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">오류 발생</CardTitle>
            <CardDescription>결과를 불러오는 중 오류가 발생했습니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleBack} className="w-full">
              처음으로 돌아가기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
      <div className="container max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="mb-4 gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            처음으로
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">
                내 진단 결과
              </h1>
              <p className="text-slate-600">
                {userEmail}님의 가치 발견 기록
              </p>
            </div>
            <Button onClick={handleStartNew} className="gap-2">
              <Plus className="w-4 h-4" />
              새로운 진단 시작
            </Button>
          </div>
        </div>

        {/* 결과 목록 */}
        {!results || results.length === 0 ? (
          <Card className="text-center py-12">
            <CardHeader>
              <CardTitle className="text-2xl">아직 진단 결과가 없습니다</CardTitle>
              <CardDescription className="text-base mt-2">
                첫 번째 가치 발견 진단을 시작해보세요!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleStartNew} size="lg" className="gap-2">
                <Plus className="w-5 h-5" />
                진단 시작하기
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-slate-600 mb-4">
              총 {results.length}개의 진단 결과
            </div>
            
            {results.map((result: AssessmentResult) => (
              <Card
                key={result.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setExpandedId(expandedId === result.id ? null : result.id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl flex items-center gap-2">
                        <User className="w-5 h-5 text-primary" />
                        {result.name}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(result.createdAt)}
                      </CardDescription>
                    </div>
                    <div className="text-sm text-slate-500">
                      {expandedId === result.id ? "접기 ▲" : "펼치기 ▼"}
                    </div>
                  </div>
                </CardHeader>
                
                {expandedId === result.id && (
                  <CardContent>
                    <div className="space-y-3 pt-2 border-t">
                      <h3 className="font-semibold text-slate-700 mb-3">
                        선택한 핵심 가치 3가지
                      </h3>
                      <div className="grid gap-3">
                        <div className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg">
                          <span className="text-2xl">🥇</span>
                          <div>
                            <div className="font-semibold text-primary">1위</div>
                            <div className="text-slate-900">{result.value1}</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg">
                          <span className="text-2xl">🥈</span>
                          <div>
                            <div className="font-semibold text-primary">2위</div>
                            <div className="text-slate-900">{result.value2}</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg">
                          <span className="text-2xl">🥉</span>
                          <div>
                            <div className="font-semibold text-primary">3위</div>
                            <div className="text-slate-900">{result.value3}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
