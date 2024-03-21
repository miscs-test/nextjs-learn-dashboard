import { fetchSortedScores } from "@/app/lib/data-mysql";
import PRScoreRank from "@/app/ui/dashboard/pr-score-rank";
import { lusitana } from "@/app/ui/fonts";
import { LatestInvoicesSkeleton } from "@/app/ui/skeletons";
import { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: 'Rank',
};

async function LatestInvoicesWrapper() {
  const prScores = await fetchSortedScores()
  return <PRScoreRank prScores={prScores} />
}

export default function Page() {
  return (
    <main>
      <h1 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>
        Rank
      </h1>
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-4 lg:grid-cols-8">
        <Suspense fallback={<LatestInvoicesSkeleton />}>
          <LatestInvoicesWrapper />
        </Suspense>
      </div>
    </main>
  )
}
