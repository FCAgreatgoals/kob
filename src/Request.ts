import { IncomingMessage } from 'node:http'
import { Body, HttpMethod, MultipartFields } from './types'
import { Socket, isIP } from 'node:net'
import Base from './Base'
import Context from './Context'
import accepts, { Accepts } from 'accepts'
import parseurl from 'parseurl'
import { ParsedUrlQuery } from 'node:querystring'
import { URLSearchParams } from 'node:url'
import contentType from 'content-type'
import fresh from 'fresh'
import { File, IncomingForm } from 'formidable'

export default class Request extends Base {

	private readonly rawRequest: IncomingMessage
	private body: Body | null
	private readonly _accept: Accepts

	constructor(context: Context, rawRequest: IncomingMessage) {
		super(context)

		this.rawRequest = rawRequest
		this.body = null
		this._accept = accepts(this.rawRequest)
	}

	public getRawRequest(): IncomingMessage {
		return this.rawRequest
	}

	private parseMultipartFormData(request: IncomingMessage): Promise<MultipartFields> {
		const form = new IncomingForm()
		const fields: MultipartFields = {}

		form.on('field', (name: string, value: string): void => {
			try {
				fields[name] = {
					type: 'json',
					value: JSON.parse(value),
				}
			} catch (_) {
				fields[name] = {
					type: 'string',
					value: value,
				}
			}
		})

		form.on('file', (name: string, file: File): void => {
			const [filename, extension] = (file.originalFilename || 'unknown.unknown').split('.')

			fields[name] = {
				type: 'file',
				mimetype: file.mimetype || 'unknown',
				filename: filename,
				extension: extension,
				size: file.size,
				tmpPath: file.filepath,
			}
		})

		return new Promise((resolve, reject) => {
			form.parse(request, (err: any) => {
				if (err) return reject(err)
				resolve(fields)
			})
		})
	}

	public async getBody(): Promise<Body> {
		if (this.body === null) return new Promise(async (resolve) => {
				const bodyParts: Array<any> = []
				const contentType = this.getHeader('Content-Type')

				if (contentType && contentType.startsWith('multipart/form-data')) {
					this.body = await this.parseMultipartFormData(this.getRawRequest())
					resolve(this.body)
					return
				}

				this.rawRequest
					.on('data', (chunk) => {
						bodyParts.push(chunk)
					})
					.on('end', () => {
						const buffer = Buffer.concat(bodyParts)

						if (!contentType) {
							this.body = buffer
							return resolve(this.body)
						}

						if (contentType.startsWith('text/') || contentType.startsWith('application/javascript') || contentType.startsWith('application/typescript') || contentType.startsWith('application/x-sh')) {
							this.body = buffer.toString()
						}

						if (contentType.startsWith('application/json')) {
							this.body = JSON.parse(buffer.toString())
						}

						if (!this.body) {
							this.body = buffer
						}

						resolve(this.body)
					})
			})

		return this.body
	}

	public getHttpVersion(): string {
		return this.rawRequest.httpVersion
	}

	public getHttpVersionMajor(): number {
		return this.rawRequest.httpVersionMajor
	}

	public getHttpVersionMinor(): number {
		return this.rawRequest.httpVersionMinor
	}

	public getURL(): URL {
		return new URL(`${this.getOrigin()}${this.getUrl()}`)
	}

	public getUrl(): string {
		return this.rawRequest.url ?? ''
	}

	public getHref(): string {
		if (/^https?:\/\//i.test(this.getUrl())) return this.getUrl()
		return `${this.getOrigin()}${this.getUrl()}`
	}

	public getOrigin(): string {
		return `${this.getProtocol()}://${this.getHost()}`
	}

	public getProtocol(): string {
		if ((this.getSocket() as Socket & { encrypted: boolean })?.encrypted) {
			return 'https'
		}

		if (!this.getKob().getOption('proxy')) {
			return 'http'
		}

		const proto = this.getHeader('X-Forwarded-Proto')
		return proto ? proto.split(/\s*,\s*/, 1)[0] : 'http'
	}

	public isSecure(): boolean {
		return this.getProtocol() === 'https'
	}

	public getHost(): string {
		let host = this.getKob().getOption('proxy') && this.getHeader('X-Forwarded-Host')

		if (!host) {
			if (this.rawRequest.httpVersionMajor >= 2) host = this.getHeader(':authority')
			else host = this.getHeader('Host')
		}

		if (!host) return ''
		return host.split(/\s*,\s*/, 1)[0]
	}

	public getHostname(): string {
		const host = this.getHost()

		if (!host) return ''
		if (host[0] === '[') return this.getURL()?.hostname ?? ''

		return host.split(':', 1)[0]
	}

	public getSocket(): Socket | null {
		return this.rawRequest.socket
	}

	public getMethod(): HttpMethod  {
		return this.rawRequest.method as HttpMethod
	}

	public getPath(): string {
		return parseurl(this.rawRequest)?.pathname ?? ''
	}

	public getQuery(): ParsedUrlQuery {
		return Object.fromEntries(new URLSearchParams(this.getQueryString().toString()))
	}

	public getQueryString(): string | ParsedUrlQuery {
		return parseurl(this.rawRequest)?.query ?? ''
	}

	public getSearch(): string {
		return `?${this.getQueryString()}`
	}

	public getRawHeaders(): Array<string> {
		return this.rawRequest.rawHeaders
	}

	public getHeaderObject() {
		return this.rawRequest.headers
	}

	public getHeaders(): Headers {
		const formatedHeaders = this.rawRequest.rawHeaders
			.reduce<Array<[string, string]>>((previous, curr: string, currIndex: number) => {
				if (currIndex % 2 === 0) {
					previous.push([curr, this.rawRequest.rawHeaders[currIndex + 1]])
				}
				return previous
			}, [])

		return new Headers(formatedHeaders)
	}

	public getHeader(header: string): string | null {
		return this.getHeaders().get(header)
	}

	public getCharset(): string {
		try {
			const { parameters } = contentType.parse(this.rawRequest)
			return parameters.charset || ''
		} catch (e) {
			return ''
		}
	}

	public getLength(): number {
		const len = this.getHeader('Content-Length')
		if (len === '' || !len) return 0
		return ~~len
	}

	public getIps(): Array<string> {
		const val = this.getHeader(this.getKob().getOption('proxyIpHeader'))
		let ips = this.getKob().getOption('proxy') && val
			? val.split(/\s*,\s*/)
			: []

		if (this.getKob().getOption('maxIpsCount') > 0) {
			ips = ips.slice(-this.getKob().getOption('maxIpsCount'))
		}

		return ips
	}

	public getIp(): string {
		return this.getIps()[0] || this.getSocket()?.remoteAddress || ''
	}

	public getSubdomains(): Array<string> {
		const hostname = this.getHostname()

		if (isIP(hostname)) return []

		return hostname
			.split('.')
			.reverse()
			.slice(this.getKob().getOption('subdomainOffset'))
	}

	public getType(): string {
		const type = this.getHeader('Content-Type')
		if (!type) return ''

		return type.split(';')[0]
	}

	public isIdempotent(): boolean {
		const methods = ['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS', 'TRACE']
		return !!~methods.indexOf(this.getMethod())
	}

	public isFresh(): boolean {
		const method = this.getMethod()
		const s = this.getContext().getResponse().getStatus()

		if (method !== 'GET' && method !== 'HEAD') return false

		if ((s >= 200 && s < 300) || s === 304) {
			return fresh(this.rawRequest.headers, this.getContext().getResponse().getHeaderObject())
		}

		return false
	}

	public isStale(): boolean {
		return !this.isFresh()
	}

	public accepts(...args: Array<string>) {
		return this._accept.types(...args)
	}

	public acceptsEncodings(...args: Array<string>) {
		return this._accept.encodings(...args)
	}

	public acceptsCharsets (...args: Array<string>) {
		return this._accept.charsets(...args)
	}

	public acceptsLanguages (...args: Array<string>) {
		return this._accept.languages(...args)
	}

}
