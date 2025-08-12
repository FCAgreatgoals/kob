/**
 * This file is part of Kob (git@github.com:FCAgreatgoals/kob).
 *
 * Copyright (C) 2025 SAS French Community Agency
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

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

export type MultipartFields = {
	[key: string]: {
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
}

export type Body = string | MultipartFields | { [key: string]: any } | Stream | null

export type FileOptions = {
	type?: 'attachment' | 'inline' | string | undefined,
	fallback?: string | boolean | undefined
}
