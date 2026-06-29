// Rate limiting disabled — always allows requests
export async function checkRateLimit(
  _identifier: string,
  _limit: number,
  _window: number,
): Promise<{
  success: boolean
  remaining: number
  reset: number
}> {
  return { success: true, remaining: 999, reset: 0 }
}
