'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SalesPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/');
  }, [router]);

  return null; // Component sẽ redirect, không render gì
}