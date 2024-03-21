import clsx from 'clsx';
import Image from 'next/image';
import { lusitana } from '@/app/ui/fonts';
import { ScoreTable } from '@/app/lib/definitions';

export default async function PRScoreRank({
  prScores,
}: {
  prScores: ScoreTable[]
}) {
  return (
    <div className="flex w-full flex-col md:col-span-4">
      {/* <h2 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>
        Latest Invoices
      </h2> */}
      <div className="flex grow flex-col justify-between rounded-xl bg-gray-50 p-4">
        <div className="bg-white px-6">
          {prScores.map((item, i) => {
            return (
              <div
                key={item.github_id}
                className={clsx(
                  'flex flex-row items-center justify-between py-4',
                  {
                    'border-t': i !== 0,
                  },
                )}
              >
                <div className="flex items-center">
                  <Image
                    src={`https://avatars.githubusercontent.com/${item.github_id}?size=80`}
                    alt={`${item.name_in_company}'s profile picture`}
                    className="mr-4 rounded-full"
                    width={32}
                    height={32}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold md:text-base">
                      {item.name_in_company}
                    </p>
                    <p className="hidden text-sm text-gray-500 sm:block">
                      {item.github_id}
                    </p>
                  </div>
                </div>
                <p
                  className={`${lusitana.className} truncate text-sm font-medium md:text-base`}
                >
                  {item.total_score}
                </p>
              </div>
            );
          })}
        </div>
        {/* <div className="flex items-center pb-2 pt-6">
          <ArrowPathIcon className="h-5 w-5 text-gray-500" />
          <h3 className="ml-2 text-sm text-gray-500 ">Updated just now</h3>
        </div> */}
      </div>
    </div>
  );
}
