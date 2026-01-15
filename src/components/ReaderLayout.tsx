import React from "react";

interface ReaderLayoutProps {
  children: React.ReactNode;
  columns: 1 | 2;
  style?: React.CSSProperties;
}

const ReaderLayout: React.FC<ReaderLayoutProps> = ({ children, columns, style }) => {
  const layoutClass = columns === 1 ? "reader-layout-single" : "reader-layout-dual";
  
  return (
    <div className={layoutClass} style={style}>
      {children}
    </div>
  );
};

export default ReaderLayout;
