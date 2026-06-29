// Rate limiting disabled — always allows requests
export async function checkRateLimit(..._args: unknown[]): Promise<{
  success: boolean
  remaining: number
  reset: number
}> {
  return { success: true, remaining: 999, reset: 0 }
}
