import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { IconButton } from "../../../components/common/IconButton";
import { addMonths, currentMonthKey, monthLabel } from "../utils/dates";

interface MonthSelectorProps {
  selectedMonth: string;
  onMonthChange: (month: string) => void;
}

export const MonthSelector: React.FC<MonthSelectorProps> = ({
  selectedMonth,
  onMonthChange
}) => {
  const currentKey = currentMonthKey();
  const isAtCurrentMonth = selectedMonth >= currentKey;

  const handlePrev = () => {
    onMonthChange(addMonths(selectedMonth, -1));
  };

  const handleNext = () => {
    if (!isAtCurrentMonth) {
      onMonthChange(addMonths(selectedMonth, 1));
    }
  };

  return (
    <div className="flex items-center gap-1 bg-surface-sunken p-1 rounded-card border border-border shrink-0">
      <IconButton label="Bulan sebelumnya" onClick={handlePrev}>
        <ChevronLeft className="w-4 h-4" />
      </IconButton>

      <span className="text-[14px] font-medium text-text px-2 min-w-[120px] text-center select-none">
        {monthLabel(selectedMonth)}
      </span>

      <IconButton label="Bulan berikutnya" onClick={handleNext} disabled={isAtCurrentMonth}>
        <ChevronRight className="w-4 h-4" />
      </IconButton>
    </div>
  );
};
