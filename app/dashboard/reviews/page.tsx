import Pagination from '@/app/ui/invoices/pagination';
import ReviewsTable from '@/app/ui/invoices/reviews-table';
import { lusitana } from '@/app/ui/fonts';
import { InvoicesTableSkeleton } from '@/app/ui/skeletons';
import { Suspense } from 'react';
import { Metadata } from 'next';
import { fetchFilteredReviews } from '@/app/lib/data-mysql';
import SearchReviews from '@/app/ui/search-reviews';

export const metadata: Metadata = {
  title: 'Reviews',
};

export default async function Page({
  searchParams,
}: {
  searchParams?: {
    query?: string;
    page?: string;
    page_size?: string;
  };
}) {
  const query = searchParams?.query || '';
  const currentPage = Number(searchParams?.page) || 1;
  const pageSize = Number(searchParams?.page_size) || 10;

  const { reviews, totalPages } = await fetchFilteredReviews(query, currentPage, pageSize);

  return (
    <div className="w-full">
      <div className="flex w-full items-center justify-between">
        <h1 className={`${lusitana.className} text-2xl`}>Reviews</h1>
      </div>
      <div className="mt-4 flex items-center justify-between gap-2 md:mt-8">
        <SearchReviews placeholder='Search reviews...' />
      </div>
      <Suspense key={query + currentPage} fallback={<InvoicesTableSkeleton />}>
        <ReviewsTable reviews={reviews} />
      </Suspense>
      <div className="mt-5 flex w-full justify-center">
        <Pagination totalPages={totalPages} />
      </div>
    </div>
  );
}