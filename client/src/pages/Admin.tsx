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
import { Checkbox } from "@/components/ui/checkbox";
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
import { trpc } from "@/lib/trpc";
import { Home, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function Admin() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'single' | 'multiple', ids: number[] }>({ type: 'single', ids: [] });

  // tRPC query
  const { data: assessments, isLoading, error, refetch } = trpc.values.getAll.useQuery();
  
  // tRPC mutations
  const deleteMutation = trpc.values.delete.useMutation({
    onSuccess: () => {
      toast.success("삭제되었습니다.");
      refetch();
      setSelectedIds(new Set());
    },
    onError: (error) => {
      toast.error("삭제 실패: " + error.message);
    }
  });

  const deleteManyMutation = trpc.values.deleteMany.useMutation({
    onSuccess: () => {
      toast.success("선택한 항목이 삭제되었습니다.");
      refetch();
      setSelectedIds(new Set());
    },
    onError: (error) => {
      toast.error("삭제 실패: " + error.message);
    }
  });

  // 검색 필터링
  const filteredAssessments = assessments?.filter((assessment: any) => {
    const query = searchQuery.toLowerCase();
    return (
      assessment.name.toLowerCase().includes(query) ||
      assessment.email.toLowerCase().includes(query) ||
      assessment.value1.toLowerCase().includes(query) ||
      assessment.value2.toLowerCase().includes(query) ||
      assessment.value3.toLowerCase().includes(query)
    );
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked && filteredAssessments) {
      setSelectedIds(new Set(filteredAssessments.map((a: any) => a.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: number, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handleDeleteClick = (id: number) => {
    setDeleteTarget({ type: 'single', ids: [id] });
    setShowDeleteDialog(true);
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) {
      toast.error("삭제할 항목을 선택해주세요.");
      return;
    }
    setDeleteTarget({ type: 'multiple', ids: Array.from(selectedIds) });
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (deleteTarget.type === 'single') {
      deleteMutation.mutate({ id: deleteTarget.ids[0] });
    } else {
      deleteManyMutation.mutate({ ids: deleteTarget.ids });
    }
    setShowDeleteDialog(false);
  };

  const isAllSelected = filteredAssessments && filteredAssessments.length > 0 && 
    filteredAssessments.every((a: any) => selectedIds.has(a.id));

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
                  {assessments?.filter((a: any) => {
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
                        assessments.forEach((a: any) => {
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
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {selectedIds.size > 0 && (
                  <Button
                    variant="destructive"
                    onClick={handleDeleteSelected}
                    className="gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    선택 삭제 ({selectedIds.size})
                  </Button>
                )}
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
                        <TableHead className="w-12">
                          <Checkbox
                            checked={isAllSelected}
                            onCheckedChange={handleSelectAll}
                          />
                        </TableHead>
                        <TableHead>날짜</TableHead>
                        <TableHead>이름</TableHead>
                        <TableHead>이메일</TableHead>
                        <TableHead>가치 1</TableHead>
                        <TableHead>가치 2</TableHead>
                        <TableHead>가치 3</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAssessments.map((assessment: any) => (
                        <TableRow key={assessment.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.has(assessment.id)}
                              onCheckedChange={(checked) => handleSelectOne(assessment.id, checked as boolean)}
                            />
                          </TableCell>
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
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(assessment.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
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

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget.type === 'single' 
                ? "이 참가자의 결과가 영구적으로 삭제됩니다."
                : `선택한 ${deleteTarget.ids.length}개 항목이 영구적으로 삭제됩니다.`
              } 이 작업은 취소할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
