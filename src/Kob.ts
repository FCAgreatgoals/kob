import Emitter from 'node:events'
import Context from './Context'
import Debug from 'debug'
import onFinished from 'on-finished'
import HttpStatus from './HttpStatus'
import util from 'node:util'
import Stream from 'node:stream'
import http, { Server, IncomingMessage, ServerResponse, RequestListener } from 'node:http'
import { HttpMethod, KobOptions, Middleware } from './types'
const debug = Debug('kob:application')

export default class Kob extends Emitter {

    private readonly proxy: boolean
    private readonly subdomainOffset: number
    private readonly proxyIpHeader: string
    private readonly maxIpsCount: number
    private readonly silent: boolean
    private readonly keys: string[] | undefined
    private readonly middlewares: Array<Middleware>

    constructor(options?: KobOptions) {
        super()
        options = options || {}
        this.proxy = options.proxy || false
        this.subdomainOffset = options.subdomainOffset || 2
        this.proxyIpHeader = options.proxyIpHeader || 'X-Forwarded-For'
        this.maxIpsCount = options.maxIpsCount || 0
        this.silent = options.silent || false

        if (options.keys) {
            this.keys = options.keys
        }

        this.middlewares = []
    }

    public getProxy(): boolean {
        return this.proxy
    }

    public getProxyIpHeader(): string {
        return this.proxyIpHeader
    }

    public getMaxIpsCount(): number {
        return this.maxIpsCount
    }

    public getSubdomainOffset(): number {
        return this.subdomainOffset
    }

    public getCookiesKeys(): string[] | undefined {
        return this.keys
    }

    public listen(...args: Array<any>): Server<typeof IncomingMessage, typeof ServerResponse> {
        debug('listen')

        const server = http.createServer(this.callback())
        return server.listen(...args)
    }

    public use(fn: Middleware): this {
        if (typeof fn !== 'function') {
            throw new TypeError('middleware must be a function!')
        }

        debug('use %s', fn.name || '-')

        this.middlewares.push(fn)

        return this
    }

    private composeMiddlewares(): Middleware {
        if (!Array.isArray(this.middlewares))
            throw new TypeError('Middleware stack must be an array!')
        for (const fn of this.middlewares) {
            if (typeof fn !== 'function')
                throw new TypeError(
                    'Middleware must be composed of functions!'
                )
        }

        const middlewares = this.middlewares

        return function (context: Context, next: Middleware): Promise<undefined | void> {
            // last called middleware #
            let index = -1

            function dispatch(i: number): Promise<undefined | void> {
                if (i <= index) {
                    return Promise.reject(new Error('next() called multiple times'))
                }

                index = i

                let fn = middlewares[i]
                if (i === middlewares.length) fn = next

                if (!fn) return Promise.resolve()

                try {
                    return Promise.resolve(
                        fn(context, dispatch.bind(null, i + 1))
                    )
                } catch (err) {
                    return Promise.reject(err)
                }
            }

            return dispatch(0)
        }
    }

    public callback(): RequestListener<typeof IncomingMessage, typeof ServerResponse> {
        const fn = this.composeMiddlewares()

        if (!this.listenerCount('error')) {
            this.on('error', this.onError)
        }

        return (req: IncomingMessage, res: ServerResponse) => {
            const ctx = new Context(this, req, res)

            return this.handleRequest(ctx, fn)
        }
    }

    private handleRequest(ctx: Context, fnMiddleware: Middleware) {
        const res = ctx.getResponse()

        res.setStatus(404)

        const handleResponse = () => this.respond(ctx)

        onFinished(res.getRawResponse(), ctx.catchError.bind(ctx))

        return fnMiddleware(ctx, () => Promise.resolve(null))
            .then(handleResponse)
            .catch(ctx.catchError.bind(ctx))
    }

    private onError(err: any) {
        const isNativeError =
            Object.prototype.toString.call(err) === '[object Error]' ||
            err instanceof Error
        if (!isNativeError)
            throw new TypeError(util.format('non-error thrown: %j', err))

        if (err.status === 404 || err.expose) return
        if (this.silent) return

        const msg = err.stack || err.toString()
        console.error(`\n${msg.replace(/^/gm, '  ')}\n`)
    }

    private respond(ctx: Context) {
        if (!ctx.getResponse().isWritable()) return

        const res =  ctx.getResponse()
        const code = res.getStatus()

        // ignore body
        if (HttpStatus.isBodyEmpty(code)) {
            // strip headers
            res.setBody(null)
            return res.reply()
        }

        if (ctx.getRequest().getMethod() === HttpMethod.HEAD) {
            if (!res.isHeadersSent() && !res.hasHeader('Content-Length')) {
                const length = res.getLength()
                if (length && Number.isInteger(length)) res.setLength(length)
            }

            return res.reply()
        }

        // status body
        if (res.getBody() == null) {
            if (res.isExplicitNullBody()) {
                res.removeHeader('Content-Type')
                    .removeHeader('Transfer-Encoding')
                    .setLength(0)

                return res.reply()
            }

            if (ctx.getRequest().getHttpVersionMajor() >= 2) {
                res.setBody(String(code))
            } else {
                res.setBody(res.getMessage() || String(code))
            }

            if (!res.isHeadersSent()) {
                res.setType('text')
                    .setLength(Buffer.byteLength(res.getBody() as Buffer))
            }

            return res.reply(res.getBody())
        }

        // responses
        if (Buffer.isBuffer(res.getBody())) {
            return res.reply(res.getBody())
        }
        if (typeof res.getBody() === 'string') {
            return res.reply(res.getBody())
        }
        if (res.getBody() instanceof Stream) {
            return (res.getBody() as Stream)
                .pipe(res.getRawResponse())
        }

        res.setBody(JSON.stringify(res.getBody()))

        if (!res.isHeadersSent()) {
            res.setLength(Buffer.byteLength(res.getBody() as string))
        }

        res.reply(res.getBody())
    }

}
