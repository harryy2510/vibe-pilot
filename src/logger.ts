const timestamp = () => new Date().toISOString()

export const log = {
	info: (msg: string, ctx?: Record<string, unknown>) => {
		console.log(`[${timestamp()}] ${msg}`, ctx ? JSON.stringify(ctx) : '')
	},
	warn: (msg: string, ctx?: Record<string, unknown>) => {
		console.warn(`[${timestamp()}] WARN ${msg}`, ctx ? JSON.stringify(ctx) : '')
	},
	error: (msg: string, ctx?: Record<string, unknown>) => {
		console.error(`[${timestamp()}] ERROR ${msg}`, ctx ? JSON.stringify(ctx) : '')
	},
	cycle: (msg: string) => {
		console.log(`[${timestamp()}] ── ${msg} ──`)
	},
}
