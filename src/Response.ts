import { ServerResponse } from 'node:http'
import HttpStatus, { HttpCode } from './HttpStatus'
import Base from './Base'
import Context from './Context'
import { Body, FileOptions } from './types'
import { Stream } from 'node:stream'
import { Socket } from 'node:net'
import encodeUrl from 'encodeurl'
import { escape } from 'node:querystring'
import { extname } from 'node:path'
import contentDisposition from 'content-disposition'
import onFinished from 'on-finished'
import EventEmitter from 'node:events'
import { ReadStream } from 'node:fs'

export default class Response extends Base {

	private readonly rawResponse: ServerResponse
	private body: Body
	private _explicitNullBody: boolean
	private _statusOrBodyAlteration: boolean
	private _headersAlteration: boolean

	constructor(context: Context, rawResponse: ServerResponse) {
		super(context)

		this.rawResponse = rawResponse

		this.body = null
		this._explicitNullBody = false
		this._statusOrBodyAlteration = false
		this._headersAlteration = false
	}

	public getStatusOrBodyAlteration(): boolean {
		return this._statusOrBodyAlteration
	}

	public getHeadersAlteration(): boolean {
        return this._headersAlteration
    }

	public reply(...args: Array<any | BufferEncoding | (() => void)>): ServerResponse {
		return this.rawResponse.end(...args.map(a => {
			if (typeof a === 'object' && typeof a !== 'function') return JSON.stringify(a)
			return a
		}))
	}

	public redirect(url: string, alt?: string) {
		if (url === 'back') {
			url = this.getContext().getRequest().getHeader('Referrer') || alt || '/'
		}

		this.setHeader('Location', encodeUrl(url))

		if (!HttpStatus.isRedirectCode(this.getStatus())) {
			this.setStatus(302)
		}

		if (this.getContext().getRequest().accepts('html')) {
			url = escape(url)

			this.setContentType('text/html; charset=utf-8')
			this.setBody(`Redirection vers <a href="${url}">${url}</a>.`)

			return
		}

		this.setContentType('text/plain; charset=utf-8')
		this.setBody(`Redirection vers ${url}`)
	}

	public attachFile(filename?: string, options?: FileOptions) {
		if (filename) {
			this.setContentType(extname(filename))
		}

		this.setHeader('Content-Disposition', contentDisposition(filename, options))
	}

	public getRawResponse(): ServerResponse {
		return this.rawResponse
	}

	public getSocket(): Socket | null {
		return this.rawResponse.socket
	}

	public getHeaderObject(): { [key: string]: string | number | string[] | undefined } {
		return this.rawResponse.getHeaders()
	}

	public getHeaderNames(): Array<string> {
		return this.rawResponse.getHeaderNames()
	}

	public getHeaders(): Headers {
		return new Headers(Object.entries(this.rawResponse.getHeaders()).map(header => ([header[0], header[1]?.toString() ?? ''])) as Array<[string, string]>)
	}

	public getHeader(name: string): string | null {
		return this.getHeaders().get(name)
	}

	public setHeader(name: string, value?: string | number | string[]): this {
		if (this.isHeadersSent()) return this

		this._headersAlteration = true

		if (value) {
			if (Array.isArray(value)) {
				value = value.map(v => typeof v === 'string' ? v : String(v))
			} else if (typeof value != 'string') {
				value = String(value)
			}

			this.rawResponse.setHeader(name, value)
			return this
		}
		return this
	}

	public removeHeader(name: string): this {
		if (this.isHeadersSent()) return this

		this._headersAlteration = true

		this.rawResponse.removeHeader(name)
		return this
	}

	public flushHeaders(): this {
		if (this.isHeadersSent()) return this

		this._headersAlteration = true
		this.rawResponse.flushHeaders()

		return this
	}

	public hasHeader(name: string): boolean {
		return this.rawResponse.hasHeader(name)
	}

	public getMessage(): string {
		return this.rawResponse.statusMessage || HttpStatus.getMessage(this.getStatus())
	}

	public isHeadersSent(): boolean {
		return this.rawResponse.headersSent
	}

	public isWritable(): boolean {
		if (this.rawResponse.writableEnded || this.rawResponse.finished) {
			return false
		}

		if (!this.getSocket()) {
			return true
		}

		return (this.getSocket() as Socket).writable
	}

	public isExplicitNullBody(): boolean {
		return this._explicitNullBody
	}

	public getBody(): Body {
		return this.body
	}

	public setBody(body: Body): this {
		const original = this.body
		this.body = body
		this._statusOrBodyAlteration = true

		if (body == null) {
			if (!HttpStatus.isBodyEmpty(this.getStatus())) {
				if (this.getContentType() === 'application/json') {
					this.body = 'null'
					return this
				}

				this.setStatus(204)
			}

			if (body === null) {
				this._explicitNullBody = true
			}

			this.removeHeader('Content-Type')
				.removeHeader('Content-Length')
				.removeHeader('Transfer-Encoding')

			return this
		}

		if (typeof body === 'string') {
			if (!this.hasHeader('Content-Type')) {
				this.setContentType(/^\s*</.test(body) ? 'html' : 'text')
			}

			this.setLength(Buffer.byteLength(body))

			return this
		}

		if (Buffer.isBuffer(body)) {
			if (!this.hasHeader('Content-Type')) {
				this.setContentType('bin')
			}

			this.setLength(body.length)

			return this
		}

		if (body instanceof Stream) {
			onFinished(this.getContext().getResponse().rawResponse, destroyStream.bind(null, body))

			if (original !== body) {
				body.once('error', err => this.getContext().catchError(err))

				if (original != null) {
					this.removeHeader('Content-Length')
				}
			}

			if (!this.hasHeader('Content-Type')) {
				this.setContentType('bin')
			}

			return this
		}

		this.removeHeader('Content-Length').setContentType('json')

		return this
	}

	public getContentType(): string {
		const type = this.getHeader('Content-Type')
		if (!type) return ''
		return type.split(';', 1)[0]
	}

	public setContentType(type: string): this {
		if (this.isHeadersSent()) return this

		this.setHeader('Content-Type', type)

		return this
	}

	public getLength(): number | undefined {
		if (this.hasHeader('Content-Length')) {
			return parseInt(this.getHeader('Content-Length') ?? '0', 10) ?? 0
		}

		if (!this.body || this.body instanceof Stream) {
			return undefined
		}

		if (typeof this.body === 'string') {
			return Buffer.byteLength(this.body)
		}

		if (Buffer.isBuffer(this.body)) {
			return this.body.length
		}

		return Buffer.byteLength(JSON.stringify(this.body))
	}

	public setLength(length: number): this {
		if (!this.hasHeader('Transfer-Encoding')) {
			this.setHeader('Content-Length', length)
		}

		return this
	}

	public getLastModified(): Date | undefined {
		const date = this.getHeader('Last-Modified')
		if (date) return new Date(date)
	}

	public setLastModified(date: Date | string): this {
		if (this.isHeadersSent()) return this

		if (typeof date === 'string') {
			date = new Date(date)
		}

		this.setHeader('Last-Modified', date.toUTCString())

		return this
	}

	public getEtag(): string | null {
		return this.getHeader('ETag')
	}

	public getStatus(): HttpCode {
		return this.rawResponse.statusCode as HttpCode
	}

	public setStatus(code: HttpCode): this {
		if (this.isHeadersSent()) return this

		this._statusOrBodyAlteration = true

		if (!HttpStatus.getMessage(code)) {
			throw new Error(`Invalid status code : ${code}`)
		}

		this.rawResponse.statusCode = code

		if (this.getContext().getRequest().getHttpVersionMajor() < 2) {
			this.rawResponse.statusMessage = HttpStatus.getMessage(code)
		}

		if (this.getBody() && HttpStatus.isBodyEmpty(code)) {
			this.setBody(null)
		}

		return this
	}

}

function destroyStream(stream: object, suppress: Error | null) {
  if (stream instanceof ReadStream) {
    stream.destroy()
    if (typeof stream.close === 'function') {
      stream.on('open', (fd) =>  {
        if (typeof fd === 'number') {
          stream.close()
        }
      })
    }
  }

  if (stream instanceof EventEmitter && suppress) {
    stream.removeAllListeners('error')
    stream.addListener('error', () => undefined)
  }

  return stream
}
