import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'In báo cáo - KHO ĐÔNG ALIBABA',
  description: 'Trang in báo cáo bán hàng',
};

export default function PrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          nav, header, .navigation {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
          }
          body {
            background: white !important;
          }
        `
      }} />
      <div className="print-layout" suppressHydrationWarning={true}>
        {children}
      </div>
    </>
  );
}