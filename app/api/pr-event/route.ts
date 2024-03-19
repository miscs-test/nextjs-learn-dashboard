export const dynamic = 'force-dynamic' // defaults to auto

export async function POST(request: Request) {
  try {
    const data = await request.json()
    // Process the webhook payload
    console.log({ data })
    return Response.json({ data })
  } catch (error: any) {
    return new Response(`Webhook error: ${error.message}`, {
      status: 400,
    })
  }
}
