import { Stream } from 'stream'
import Context from './Context'

export type KobOptions = {
    keys?: Array<string>,
    proxy?: boolean,
    subdomainOffset?: number,
    proxyIpHeader?: string,
    maxIpsCount?: number,
	silent?: boolean
};

export type Middleware = (context: Context, next: () => Promise<any>) => Promise<any | void>

export enum HttpMethod {
	GET = 'GET',
	HEAD = 'HEAD',
	POST = 'POST',
	PUT = 'PUT',
	DELETE = 'DELETE',
	CONNECT = 'CONNECT',
	OPTIONS = 'OPTIONS',
	TRACE = 'TACE',
	PATCH = 'PATCH'
}

export type Body = string | object | Stream | null

export type FileOptions = {
	type?: 'attachment' | 'inline' | string | undefined,
	fallback?: string | boolean | undefined
}
