import { IncomingMessage, ServerResponse } from 'node:http'
import Kob from './Kob'
import Request from './Request'
import Response from './Response'
import util from 'node:util'
import HttpStatus from './HttpStatus'

export default class Context {

	private readonly kob: Kob
	private readonly request: Request
	private readonly response: Response

	constructor(kob: Kob, rawRequest: IncomingMessage, rawResponse: ServerResponse) {
		this.kob = kob

		this.request = new Request(this, rawRequest)
		this.response = new Response(this, rawResponse)
	}

	public getKob(): Kob {
		return this.kob
	}

	public getRequest(): Request {
		return this.request
	}

	public getResponse(): Response {
		return this.response
	}

	public catchError(err: any) {
		if (err === null) return

		if (!(Object.prototype.toString.call(err) === '[object Error]' || err instanceof Error)) {
			err = new Error(util.format('non-error thrown: %j', err))
		}

		let headerSent = false

		if (this.response.isHeadersSent() || !this.response.isWritable()) {
			headerSent = true
			err.headerSent = true
		}

		this.getKob().emit('error', err, this)

		if (headerSent) {
			return
		}

		this.response
			.getHeaderNames()
			.forEach(name => this.response.removeHeader(name))

		this.response
			.setHeader(err.headers)
			.setType('text')

		let statusCode = err.status || err.statusCode

		if (err.code === 'ENOENT') {
			statusCode = 404
		}

		if (typeof statusCode !== 'number' || !HttpStatus.hasCode(statusCode)) {
			statusCode = 500
		}
	}
}
