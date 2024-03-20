const larkBotUrl = process.env.LARK_BOT_URL ?? ''

export function sendLarkMessage(message?: string) {
  if (!message) return;

  return fetch(larkBotUrl, {
    method: "POST",
    body: JSON.stringify({
      msg_type: "interactive",
      card: {
        config: {
          wide_screen_mode: true,
        },
        elements: [
          {
            tag: "markdown",
            content: message,
          },
        ],
      },
    }),
  });
}
