import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import { mockAll, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";

// ============================================================================
// PACKET 0006: 수면 기록 입력 페이지 (`/record`)
// ============================================================================
// BottomSheet 휠(select 기반, 텍스트 키보드 미사용)로 취침/기상 시간을 선택하고
// 실시간 부족분(deficit-preview)을 보여준 뒤 저장/수정한다. 오늘 기록이 있으면
// 프리필 + '수정하기' 라벨. 미입력/INVALID_DURATION/QUOTA 분기를 처리한다.
// useTodayRecord/saveRecord/updateStreak는 각각 packet-0003/0004에서 검증됨 —
// 이 패킷은 RecordPage의 조립/분기 로직만 격리 테스트한다.

mockAll();

const mockUseTodayRecord = vi.fn();
vi.mock("@/hooks/useTodayRecord", () => ({
  useTodayRecord: () => mockUseTodayRecord(),
}));

const mockSaveRecord = vi.fn();
const mockGetRecordByDate = vi.fn();
vi.mock("@/lib/records", () => ({
  saveRecord: (...args: unknown[]) => mockSaveRecord(...args),
  getRecordByDate: (...args: unknown[]) => mockGetRecordByDate(...args),
}));

const mockUpdateStreak = vi.fn();
const mockGetStreak = vi.fn();
vi.mock("@/lib/streak", () => ({
  updateStreak: (...args: unknown[]) => mockUpdateStreak(...args),
  getStreak: (...args: unknown[]) => mockGetStreak(...args),
}));

import RecordPage from "@/pages/RecordPage";

interface TodayRecordShape {
  date: string;
  bedTime: string;
  wakeTime: string;
  actualSleepMin: number;
  deficitMin: number;
  isEdit: boolean;
}

function setTodayRecord(overrides: Partial<TodayRecordShape> = {}) {
  const value: TodayRecordShape = {
    date: "2026-07-31",
    bedTime: "",
    wakeTime: "",
    actualSleepMin: 0,
    deficitMin: 0,
    isEdit: false,
    ...overrides,
  };
  mockUseTodayRecord.mockReturnValue(value);
  return value;
}

// 취침/기상 항목(ListRow) 클릭 → BottomSheet 휠(select) 선택 → 확인
function selectTime(rowTestId: "bedtime-row" | "waketime-row", hour: string, minute: string) {
  fireEvent.click(screen.getByTestId(rowTestId));
  fireEvent.change(screen.getByTestId("hour-select"), { target: { value: hour } });
  fireEvent.change(screen.getByTestId("minute-select"), { target: { value: minute } });
  fireEvent.click(screen.getByTestId("sheet-confirm"));
}

describe("수면 기록 입력 페이지 (`/record`)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setTodayRecord();
    mockSaveRecord.mockReturnValue({ ok: true });
    mockUpdateStreak.mockReturnValue({ current: 1, best: 1, lastCheckDate: "2026-07-31" });
  });

  // ── AC-1[P0]: BottomSheet 휠 선택(텍스트 키보드 미사용) + 오늘 기록 프리필 ──
  describe("AC-1[P0]: 오늘 기록 유무에 따라 신규/프리필 폼과 CTA 라벨이 갈린다", () => {
    it("오늘 기록이 없으면 빈 안내 문구와 '저장하기' 버튼을 보여준다", () => {
      setTodayRecord({ isEdit: false, bedTime: "", wakeTime: "" });
      renderWithRouter(React.createElement(RecordPage));

      expect(screen.getByTestId("bedtime-row").textContent).toContain("취침 시간을 선택해주세요");
      expect(screen.getByTestId("waketime-row").textContent).toContain("기상 시간을 선택해주세요");
      expect(screen.getByRole("button", { name: "저장하기" })).not.toBeNull();
    });

    it("오늘 기록이 있으면 취침·기상 시간이 프리필되고 버튼이 '수정하기'로 바뀐다", () => {
      setTodayRecord({ isEdit: true, bedTime: "23:00", wakeTime: "07:00" });
      renderWithRouter(React.createElement(RecordPage));

      expect(screen.getByTestId("bedtime-row").textContent).toContain("23:00");
      expect(screen.getByTestId("waketime-row").textContent).toContain("07:00");
      expect(screen.getByRole("button", { name: "수정하기" })).not.toBeNull();
      expect(screen.queryByRole("button", { name: "저장하기" })).toBeNull();
    });

    it("취침 항목 클릭 시 BottomSheet가 휠(select) 선택 UI로 열리고 텍스트 입력창은 없다", () => {
      renderWithRouter(React.createElement(RecordPage));

      fireEvent.click(screen.getByTestId("bedtime-row"));

      expect(screen.getByRole("dialog")).not.toBeNull();
      expect(screen.getByTestId("hour-select").tagName).toBe("SELECT");
      expect(screen.getByTestId("minute-select").tagName).toBe("SELECT");
      expect(document.querySelectorAll('input[type="text"]').length).toBe(0);
    });
  });

  // ── AC-2[P0]: deficit-preview 실시간 표시 ──
  describe("AC-2[P0]: 취침·기상 시간을 모두 선택하면 부족분을 실시간으로 미리보기한다", () => {
    it("취침 00:00 / 기상 07:00 선택 시 deficit-preview가 '오늘 부채 60분'을 표시한다", () => {
      renderWithRouter(React.createElement(RecordPage));

      expect(screen.queryByTestId("deficit-preview")).toBeNull();

      selectTime("bedtime-row", "00", "00");
      selectTime("waketime-row", "07", "00");

      const preview = screen.getByTestId("deficit-preview");
      expect(preview.textContent).toContain("오늘 부채 60분");
    });
  });

  // ── AC-3[P0]: 미입력 제출 / INVALID_DURATION 에러 분기 ──
  describe("AC-3[P0]: 미입력 제출과 비정상 수면 시간을 각각 인라인 에러로 안내한다", () => {
    it("취침·기상 시간을 선택하지 않고 제출하면 인라인 에러를 보여주고 저장을 시도하지 않는다", () => {
      renderWithRouter(React.createElement(RecordPage));

      fireEvent.click(screen.getByRole("button", { name: "저장하기" }));

      expect(screen.getByText("취침·기상 시간을 모두 선택해주세요")).not.toBeNull();
      expect(mockSaveRecord).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("saveRecord가 INVALID_DURATION을 던지면 '수면 시간을 확인해주세요' 에러를 보여준다", () => {
      mockSaveRecord.mockImplementationOnce(() => {
        throw new Error("INVALID_DURATION");
      });
      renderWithRouter(React.createElement(RecordPage));

      selectTime("bedtime-row", "23", "00");
      selectTime("waketime-row", "07", "00");
      fireEvent.click(screen.getByRole("button", { name: "저장하기" }));

      expect(screen.getByText("수면 시간을 확인해주세요")).not.toBeNull();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  // ── AC-4[P0]: 정상 제출 → saveRecord + updateStreak → Toast → navigate ──
  describe("AC-4[P0]: 정상 제출 시 기록을 저장하고 스트릭을 갱신한 뒤 홈으로 이동한다", () => {
    it("취침 23:00 / 기상 07:00 저장 시 saveRecord·updateStreak가 올바른 값으로 호출되고 Toast 후 navigate('/')한다", () => {
      renderWithRouter(React.createElement(RecordPage));

      selectTime("bedtime-row", "23", "00");
      selectTime("waketime-row", "07", "00");
      fireEvent.click(screen.getByRole("button", { name: "저장하기" }));

      expect(mockSaveRecord).toHaveBeenCalledWith({
        date: "2026-07-31",
        bedTime: "23:00",
        wakeTime: "07:00",
      });
      expect(mockUpdateStreak).toHaveBeenCalledWith("2026-07-31");
      expect(screen.getByRole("status").textContent).toContain("기록이 저장됐어요");
      expect(mockNavigate).toHaveBeenCalledWith("/", { state: { savedDate: "2026-07-31" } });
    });
  });

  // ── AC-5[P0]: 저장 공간 부족(QUOTA) → AlertDialog, 화면 유지 ──
  describe("AC-5[P0]: 저장 실패(QUOTA)면 AlertDialog로 안내하고 화면을 유지한다", () => {
    it("saveRecord가 {ok:false, reason:'QUOTA'}를 반환하면 안내 문구를 담은 AlertDialog가 뜨고 닫기로 화면에 남는다", () => {
      mockSaveRecord.mockReturnValueOnce({ ok: false, reason: "QUOTA" });
      renderWithRouter(React.createElement(RecordPage));

      selectTime("bedtime-row", "23", "00");
      selectTime("waketime-row", "07", "00");
      fireEvent.click(screen.getByRole("button", { name: "저장하기" }));

      const dialog = screen.getByRole("alertdialog");
      expect(dialog.textContent).toContain("저장 공간이 부족해요");
      expect(dialog.textContent).toContain("오래된 기록을 정리해주세요");
      expect(mockNavigate).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole("button", { name: "닫기" }));

      expect(screen.queryByRole("alertdialog")).toBeNull();
      expect(screen.getByTestId("bedtime-row")).not.toBeNull();
    });
  });

  // ── AC-6: 레이아웃 골격 — 하단 SubmitFooter 44px 터치영역, 버튼 중첩 없음 ──
  describe("AC-6: 레이아웃 골격 검증", () => {
    it("저장 버튼 안에 중첩된 <button>이 없다(FixedBottomCTA 자체가 버튼)", () => {
      const { container } = renderWithRouter(React.createElement(RecordPage));

      container.querySelectorAll("button").forEach((btn) => {
        expect(btn.querySelector("button")).toBeNull();
      });
    });
  });
});
