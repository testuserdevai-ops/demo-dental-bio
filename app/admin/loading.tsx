import { Card, CardContent } from "@/app/components/ui/card";
import { Skeleton } from "@/app/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading admin workspace"
      className="mx-auto max-w-7xl space-y-8 p-4 sm:p-8 lg:p-10"
      role="status"
    >
      <div className="space-y-3">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-5 w-full max-w-2xl" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index}>
            <CardContent className="space-y-3 pt-6">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      <span className="sr-only">Loading admin workspace</span>
    </div>
  );
}
