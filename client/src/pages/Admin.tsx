import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Home, Search } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export default function Admin() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  // tRPC query
  const { data: assessments, isLoading, error } = trpc.values.getAll.useQuery();

  // 검색 필터링
  const filteredAssessments = assessments?.filter((assessment) => {
    const query = searchQuery.toLowerCase();
    return (
      assessment.name.toLowerCase().includes(query) ||
      assessment.email.toLowerCase().includes(query) ||
      assessment.value1.toLowerCase().includes(query) ||
      assessment.value2.toLowerCase().includes(query) ||
      assessment.value3.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container py-12">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* 헤더 */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">관리자 대시보드</h1>
              <p className="text-muted-foreground mt-2">
                참가자들의 가치 발견 결과를 확인하세요
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setLocation("/")}
              className="gap-2"
            >
              <Home className="w-4 h-4" />
              홈으로
            </Button>
          </div>

          {/* 통계 카드 */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">총 참가자</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-primary">
                  {assessments?.length || 0}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">오늘 참가자</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-primary">
                  {assessments?.filter((a) => {
                    const today = new Date();
                    const createdAt = new Date(a.createdAt);
                    return (
                      createdAt.getDate() === today.getDate() &&
                      createdAt.getMonth() === today.getMonth() &&
                      createdAt.getFullYear() === today.getFullYear()
                    );
                  }).length || 0}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">가장 많이 선택된 가치</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-primary">
                  {assessments && assessments.length > 0
                    ? (() => {
                        const valueCounts: Record<string, number> = {};
                        assessments.forEach((a) => {
                          valueCounts[a.value1] = (valueCounts[a.value1] || 0) + 1;
                          valueCounts[a.value2] = (valueCounts[a.value2] || 0) + 1;
                          valueCounts[a.value3] = (valueCounts[a.value3] || 0) + 1;
                        });
                        const topValue = Object.entries(valueCounts).sort(
                          ([, a], [, b]) => b - a
                        )[0];
                        return `${topValue[0]} (${topValue[1]})`;
                      })()
                    : "-"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 검색 */}
          <Card>
            <CardHeader>
              <CardTitle>참가자 결과</CardTitle>
              <CardDescription>
                이름, 이메일, 가치로 검색할 수 있습니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* 테이블 */}
              {isLoading ? (
                <div className="text-center py-12 text-muted-foreground">
                  로딩 중...
                </div>
              ) : error ? (
                <div className="text-center py-12 text-destructive">
                  데이터를 불러오는데 실패했습니다.
                </div>
              ) : filteredAssessments && filteredAssessments.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>날짜</TableHead>
                        <TableHead>이름</TableHead>
                        <TableHead>이메일</TableHead>
                        <TableHead>가치 1</TableHead>
                        <TableHead>가치 2</TableHead>
                        <TableHead>가치 3</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAssessments.map((assessment) => (
                        <TableRow key={assessment.id}>
                          <TableCell className="whitespace-nowrap">
                            {new Date(assessment.createdAt).toLocaleDateString("ko-KR", {
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </TableCell>
                          <TableCell className="font-medium">
                            {assessment.name}
                          </TableCell>
                          <TableCell>{assessment.email}</TableCell>
                          <TableCell>
                            <span className="inline-block px-2 py-1 rounded-md bg-primary/10 text-primary text-sm">
                              {assessment.value1}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="inline-block px-2 py-1 rounded-md bg-primary/10 text-primary text-sm">
                              {assessment.value2}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="inline-block px-2 py-1 rounded-md bg-primary/10 text-primary text-sm">
                              {assessment.value3}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  {searchQuery
                    ? "검색 결과가 없습니다."
                    : "아직 참가자가 없습니다."}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
