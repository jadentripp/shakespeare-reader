import React from "react";
import { cn } from "@/lib/utils";

interface ReaderLayoutProps {
  children: React.ReactNode;
  columns: 1 | 2;
  style?: React.CSSProperties;
}

const ReaderLayout: React.FC<ReaderLayoutProps> = ({ children, columns, style }) => {
  return (
    <div
      data-columns={columns}
      className={cn(
        "relative h-full w-full overflow-hidden rounded-none border-2 border-black dark:border-white bg-background shadow-2xl",
        columns === 2 && "border-x-4"
      )}
      style={style}
    >
      {children}
    </div>
  );
};

export default ReaderLayout;
