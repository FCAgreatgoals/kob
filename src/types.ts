import { Stream } from 'node:stream'
import Context from './Context'

export type KobOptions = {
    proxy: boolean,
    subdomainOffset: number,
    proxyIpHeader: string,
    maxIpsCount: number,
	silent: boolean
}

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

export type MultipartField = {
	type: 'string',
	value: string
} | {
	type: 'json',
	value: {
		[key: string]: string
	}
} | {
	type: 'file',
	mimetype: string,
	filename: string,
	extension: string,
	size: number,
	tmpPath: string
}

export type Body = string | { [key: string]: any } | Array<MultipartField> | Stream | null

export type FileOptions = {
	type?: 'attachment' | 'inline' | string | undefined,
	fallback?: string | boolean | undefined
}
