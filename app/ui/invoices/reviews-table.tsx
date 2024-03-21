import Image from 'next/image';
import InvoiceStatus from '@/app/ui/invoices/status';
import { formatDateToLocal, formatCurrency } from '@/app/lib/utils';

export default async function ReviewsTable({
  reviews
}: {
  reviews: any[]
}) {
  return (
    <div className="mt-6 flow-root">
      <div className="inline-block min-w-full align-middle">
        <div className="rounded-lg bg-gray-50 p-2 md:pt-0">
          <table className="min-w-full text-gray-900">
            <thead className="rounded-lg text-left text-sm font-normal">
              <tr>
                <th scope="col" className="px-4 py-5 font-medium sm:pl-6">
                  Reviewer
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Pull Request
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Score
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {reviews?.map((review) => (
                <tr
                  key={review.pr_url + '_' + review.pr_reviewer}
                  className="w-full border-b py-3 text-sm last-of-type:border-none [&:first-child>td:first-child]:rounded-tl-lg [&:first-child>td:last-child]:rounded-tr-lg [&:last-child>td:first-child]:rounded-bl-lg [&:last-child>td:last-child]:rounded-br-lg"
                >
                  <td className="whitespace-nowrap py-3 pl-6 pr-3">
                    <div className="flex items-center gap-3">
                      <Image
                        src={`https://avatars.githubusercontent.com/${review.pr_reviewer}?size=80`}
                        className="rounded-full"
                        width={28}
                        height={28}
                        alt={`${review.pr_reviewer}'s profile picture`}
                      />
                      <p className='font-semibold'>{review.pr_reviewer}</p>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <div className='flex flex-col'>
                      <a href={review.pr_url} className="text-blue-400">{review.pr_title}</a>
                      <span>{review.pr_labels}</span>
                      <span><span className="text-gray-500">opened by</span> <span className="font-semibold">{review.pr_author}</span></span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {review.pr_score}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {formatDateToLocal(review.updated_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
