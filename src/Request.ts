import { IncomingMessage } from 'http'
import { HttpMethod } from './types'
import { Socket, isIP } from 'net'
import Base from './Base'
import Context from './Context'
import accepts, { Accepts } from 'accepts'
import parseurl from 'parseurl'
import { ParsedUrlQuery, decode } from 'querystring'
import contentType from 'content-type'
import fresh from 'fresh'

export default class Request extends Base {

	private readonly rawRequest: IncomingMessage
	private readonly _accept: Accepts

	constructor(context: Context, rawRequest: IncomingMessage) {
		super(context)

		this.rawRequest = rawRequest
		this._accept = accepts(this.rawRequest)
	}

	public getRawRequest(): IncomingMessage {
		return this.rawRequest
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

		if (!this.getKob().getProxy()) {
			return 'http'
		}

		const proto = this.getHeader('X-Forwarded-Proto')
		return proto ? proto.split(/\s*,\s*/, 1)[0] : 'http'
	}

	public isSecure(): boolean {
		return this.getProtocol() === 'https'
	}

	public getHost(): string {
		let host = this.getKob().getProxy() && this.getHeader('X-Forwarded-Host')

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

	public getQuery() {
		return decode(this.getQueryString().toString())
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
		const val = this.getHeader(this.getKob().getProxyIpHeader())
		let ips = this.getKob().getProxy() && val
			? val.split(/\s*,\s*/)
			: []

		if (this.getKob().getMaxIpsCount() > 0) {
			ips = ips.slice(-this.getKob().getMaxIpsCount())
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
			.slice(this.getKob().getSubdomainOffset())
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
