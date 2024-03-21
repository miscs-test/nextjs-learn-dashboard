import { getScores, saveReview } from '@/app/lib/data-mysql'
// import { saveReview as saveReviewToPg } from '@/app/lib/data-pg'
import { sendLarkMessage } from '@/app/lib/lark-bot'
import { getLabelsAndScore, pullRequest, pullRequestReview } from '@/app/lib/pr-message'
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic' // defaults to auto

export async function POST(request: Request) {
  try {
    const headersList = headers()
    const eventName = headersList.get('x-github-event')

    let msg
    const event = await request.json()
    if (eventName === 'pull_request') {
      msg = pullRequest(event)

      const { action, pull_request } = event
      if ((action === 'opened' || action === 'reopened') && pull_request.draft === false) {
        const scores = await getScores()
        msg += `\n---\n**CURRENT SCORES**: ${scores}`
      }
    } else if (eventName === 'pull_request_review') {
      msg = pullRequestReview(event)

      if (!!msg) {
        const scoreMsg = await saveReview(event)

        // await saveReviewToPg(event)

        if (scoreMsg !== '') {
          const { pull_request } = event
          msg += `\n${getLabelsAndScore(pull_request)}, **${scoreMsg}**`

          const scores = await getScores()
          msg += `\n---\n**CURRENT SCORES**: ${scores}`
        }
      }
    }
    await sendLarkMessage(msg)

    return Response.json({ msg })
  } catch (error: any) {
    await sendLarkMessage(`Webhook error: ${error.message}`)

    return new Response(`Webhook error: ${error.message}`, {
      status: 400,
    })
  }
}
