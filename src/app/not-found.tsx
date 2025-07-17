'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="flex h-screen items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="text-center shadow-lg dark:bg-gray-900">
          <CardHeader>
            <CardTitle className="text-2xl sm:text-3xl font-bold">
              Kandy Radio Engineering
            </CardTitle>
            <CardDescription className="text-red-500 dark:text-red-400 mt-1">
              404 – Page Not Found
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">
              Sorry, we couldn't find the page you're looking for.
            </p>
            <Button onClick={() => router.back()} className="w-full">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
