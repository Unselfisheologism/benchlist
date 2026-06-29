// Rate limiting disabled — always allows requests
/* eslint-disable @typescript-eslint/no-unused-vars */
export async function checkRateLimit(
  identifier?: string,
  limit?: number,
  window?: number,
): Promise<{
  success: boolean
  remaining: number
  reset: number
}> {
  return { success: true, remaining: 999, reset: 0 }
}
