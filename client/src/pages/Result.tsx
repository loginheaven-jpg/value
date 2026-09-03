import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import { Home, RotateCcw, Copy, ChevronDown, ChevronUp, Settings, History } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

// 성찰 질문은 코드가 아니라 데이터다(Phase 38).
//   `client/public/values.json` 의 각 카드가 `questions` 2개를 직접 들고 있으며 id 로 붙어 있다.
//   한글명을 키로 쓰던 매핑은 카드 이름이 바뀌면 조용히 끊겼다 — Phase 22 의 개명으로 32장이
//   기본 질문에 떨어지고 사문 키 9개가 남았던 것이 그 결과다.
//
// 기본 질문은 데이터가 없을 때만 쓴다. 런타임에 만들어지는 커스텀 가치(`questions: []`)와,
//   이 배포 이전에 저장된 localStorage 값(`questions` 없음)이 여기로 떨어진다.
const DEFAULT_QUESTIONS = [
  "이 가치가 당신의 삶에서 어떻게 나타나나요?",
  "이 가치를 실천하기 위해 어떤 노력을 하고 있나요?",
];

export default function Result() {
  const [, setLocation] = useLocation();
  const [finalValues, setFinalValues] = useState<Value[]>([]);

  const [showRestartDialog, setShowRestartDialog] = useState(false);

  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  
  // 커스텀 가치 추가 관련 state
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const [selectedValueIndex, setSelectedValueIndex] = useState<number | null>(null);
  
  // 슈퍼어드민 체크 (viproject@naver.com)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  
  useEffect(() => {
    const storedEmail = localStorage.getItem("user-email");
    setIsSuperAdmin(storedEmail === "viproject@naver.com");
  }, []);

  // tRPC mutation
  const saveAssessment = trpc.values.save.useMutation();

  useEffect(() => {
    console.log('[DEBUG] Result useEffect 실행!');
    const saved = localStorage.getItem("values-final");
    console.log('[DEBUG] saved:', saved);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFinalValues(parsed);

        // 결과 페이지 진입 시 자동 DB 저장 (한 번만)
        const savedFlag = sessionStorage.getItem("values-saved-to-db");
        console.log("[DEBUG] savedFlag:", savedFlag);
        console.log("[DEBUG] parsed.length:", parsed.length);
        console.log("[DEBUG] parsed:", parsed);
        
        if (!savedFlag) {
          const name = localStorage.getItem("user-name");
          const email = localStorage.getItem("user-email");
          console.log("[DEBUG] name:", name);
          console.log("[DEBUG] email:", email);

          if (name && email && parsed.length === 3) {
             // 커스텀 가치 확인 (localStorage에서)
            let customValue: string | undefined = undefined;
            
            // Result.tsx에서 교체한 경우
            const customValueResult = localStorage.getItem("custom-value-result");
            if (customValueResult) {
              customValue = customValueResult;
            } else {
              // Step 3에서 추가한 경우
              const customValueData = localStorage.getItem("custom-value-step3");
              if (customValueData) {
                try {
                  const customData = JSON.parse(customValueData);
                  customValue = customData.korean;
                } catch (e) {
                  console.error("Failed to parse custom value:", e);
                }
              }
            }
            
            console.log("[DEBUG] DB 저장 시도", {
              name,
              email,
              value1: parsed[0].korean,
              value2: parsed[1].korean,
              value3: parsed[2].korean,
              customValue,
            });
            // 중복 저장 방지를 위해 mutation 호출 직후 즉시 플래그 설정
            sessionStorage.setItem("values-saved-to-db", "true");
            saveAssessment.mutate({
              name,
              email,
              value1: parsed[0].korean,
              value2: parsed[1].korean,
              value3: parsed[2].korean,
              customValue,
            }, {
              onSuccess: () => {
                console.log("결과가 자동으로 저장되었습니다.");
              },
              onError: (error) => {
                console.error("저장 실패:", error);
                // 실패 시 플래그 제거하여 재시도 가능하게 함
                sessionStorage.removeItem("values-saved-to-db");
              },
            });
          } else {
            console.log("[DEBUG] DB 저장 조건 불충족");
          }
        } else {
          console.log("[DEBUG] 이미 저장됨");
        }
      } catch (e) {
        console.error("Failed to parse final values:", e);
        setLocation("/");
      }
    } else {
      setLocation("/");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // DB 저장 함수 (재사용 가능)
  const saveToDatabase = (values?: Value[]) => {
    const valuesToSave = values || finalValues;
    const name = localStorage.getItem("user-name");
    const email = localStorage.getItem("user-email");
    
    if (!name || !email || valuesToSave.length !== 3) {
      console.log("[DEBUG] DB 저장 조건 불충족");
      return Promise.resolve();
    }

    // 커스텀 가치 확인
    let customValue: string | undefined = undefined;
    const customValueResult = localStorage.getItem("custom-value-result");
    if (customValueResult) {
      customValue = customValueResult;
    } else {
      const customValueData = localStorage.getItem("custom-value-step3");
      if (customValueData) {
        try {
          const customData = JSON.parse(customValueData);
          customValue = customData.korean;
        } catch (e) {
          console.error("Failed to parse custom value:", e);
        }
      }
    }

    console.log("[DEBUG] DB 저장 시도", {
      name,
      email,
      value1: valuesToSave[0].korean,
      value2: valuesToSave[1].korean,
      value3: valuesToSave[2].korean,
      customValue,
    });

    return new Promise<void>((resolve, reject) => {
      saveAssessment.mutate({
        name,
        email,
        value1: valuesToSave[0].korean,
        value2: valuesToSave[1].korean,
        value3: valuesToSave[2].korean,
        customValue,
      }, {
        onSuccess: () => {
          console.log("결과가 저장되었습니다.");
          sessionStorage.setItem("values-saved-to-db", "true");
          resolve();
        },
        onError: (error) => {
          console.error("저장 실패:", error);
          reject(error);
        },
      });
    });
  };

  const handleCopyValues = () => {
    const name = localStorage.getItem("user-name") || "참가자";
    const text = `${name}님의 핵심 가치\n\n${finalValues.map((v, i) => `${i + 1}. ${v.korean} (${v.english})`).join("\n")}\n\n코치의 나침반 · Value Discovery\n${new Date().toLocaleDateString("ko-KR")}`;

    navigator.clipboard.writeText(text);
    toast.success("가치 목록이 클립보드에 복사되었습니다!");
  };

  const handleRestart = () => {
    setShowRestartDialog(true);
  };

  const confirmRestart = () => {
    // 다시하기: 이름/이메일은 유지, 진단 데이터만 삭제
    localStorage.removeItem("values-progress");
    localStorage.removeItem("values-final");
    sessionStorage.removeItem("values-saved-to-db");
    // 즉시 페이지 이동 (다이얼로그 상태는 자동으로 unmount됨)
    setLocation("/sort");
  };

  const handleHome = async () => {
    // 처음으로: 저장 후 이동 (다이얼로그 없이)
    const savedFlag = sessionStorage.getItem("values-saved-to-db");
    if (!savedFlag) {
      try {
        await saveToDatabase();
        toast.success("결과가 저장되었습니다.");
      } catch (error) {
        console.error("저장 실패:", error);
        // 저장 실패해도 계속 진행
      }
    }
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

  const getReflectionQuestions = (value: Value): string[] =>
    value.questions && value.questions.length > 0 ? value.questions : DEFAULT_QUESTIONS;

  const handleReplaceValue = () => {
    if (!customValue.trim()) {
      toast.error("가치를 입력해주세요.");
      return;
    }
    if (selectedValueIndex === null) {
      toast.error("교체할 가치를 선택해주세요.");
      return;
    }

    // 새로운 커스텀 가치 객체 생성
    const newCustomValue: Value = {
      id: 1000, // 커스텀 ID
      korean: customValue.trim(),
      english: "Custom",
      description: "나만의 가치",
      category: "커스텀",
      questions: []
    };

    // finalValues 복사 및 교체
    const newFinalValues = [...finalValues];
    newFinalValues[selectedValueIndex] = newCustomValue;

    // localStorage 업데이트
    localStorage.setItem("values-final", JSON.stringify(newFinalValues));
    localStorage.setItem("custom-value-result", customValue.trim());

    // sessionStorage 플래그 초기화 (재저장 허용)
    sessionStorage.removeItem("values-saved-to-db");

    // 화면 업데이트
    setFinalValues(newFinalValues);
    setShowCustomInput(false);
    setCustomValue("");
    setSelectedValueIndex(null);

    // 즉시 DB 저장 (newFinalValues 전달)
    saveToDatabase(newFinalValues)
      .then(() => {
        toast.success("가치가 성공적으로 교체되고 저장되었습니다!");
      })
      .catch((error) => {
        console.error("저장 실패:", error);
        toast.error("저장에 실패했습니다. 다시 시도해주세요.");
      });
  };

  if (finalValues.length === 0) {
    return null;
  }

  const name = localStorage.getItem("user-name") || "참가자";

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
              <span className="text-primary font-semibold">🎉 축하합니다!</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold">
              {name}님, 당신을 발견했습니다
            </h1>
            <p className="text-lg text-muted-foreground">
              이 세 가지 가치가 당신을 당신답게 만드는 나침반입니다.<br />
              앞으로 중요한 결정을 내릴 때마다, 이 가치들을 떠올려보세요.
            </p>
          </div>

          {/* 성찰 질문 카드들 */}
          <div className="space-y-4">
            {finalValues.map((value, index) => {
              const isExpanded = expandedCards.has(value.id);
              const questions = getReflectionQuestions(value);

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

          {/* 나만의 가치 추가 */}
          <div className="text-center space-y-4">
            {!showCustomInput ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  위 3가지보다 더 중요한 가치가 있다면 추가해 주세요
                </p>
                <Button
                  variant="outline"
                  onClick={() => setShowCustomInput(true)}
                  className="gap-2"
                >
                  나만의 가치 추가하기
                </Button>
              </div>
            ) : (
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="custom-value">나만의 가치 (한글)</Label>
                    <Input
                      id="custom-value"
                      placeholder="예: 성실함, 배움, 도전정신"
                      value={customValue}
                      onChange={(e) => setCustomValue(e.target.value)}
                      maxLength={20}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>교체할 가치를 선택하세요</Label>
                    <RadioGroup
                      value={selectedValueIndex?.toString()}
                      onValueChange={(value) => setSelectedValueIndex(parseInt(value))}
                    >
                      {finalValues.map((value, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <RadioGroupItem value={index.toString()} id={`value-${index}`} />
                          <Label htmlFor={`value-${index}`} className="cursor-pointer">
                            {index + 1}. {value.korean} ({value.english})
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowCustomInput(false);
                        setCustomValue("");
                        setSelectedValueIndex(null);
                      }}
                    >
                      취소
                    </Button>
                    <Button onClick={handleReplaceValue}>
                      교체하기
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

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
              variant="default"
              onClick={async () => {
                const savedFlag = sessionStorage.getItem("values-saved-to-db");
                if (!savedFlag) {
                  try {
                    await saveToDatabase();
                    toast.success("결과가 저장되었습니다.");
                  } catch (error) {
                    console.error("저장 실패:", error);
                  }
                }
                setLocation("/my-results");
              }}
              className="gap-2"
            >
              <History className="w-5 h-5" />
              내 결과 보기
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
              진단 결과가 삭제되고 카드 선택부터 다시 시작합니다. (이름과 이메일은 유지됩니다)
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


    </div>
  );
}
