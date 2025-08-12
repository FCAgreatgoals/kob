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

export const httpCode = {
	100: 'Continue',
	101: 'Switching Protocols',
	102: 'Processing',
	103: 'Early Hints',
	200: 'OK',
	201: 'Created',
	202: 'Accepted',
	203: 'Non-Authoritative Information',
	204: 'No Content',
	205: 'Reset Content',
	206: 'Partial Content',
	207: 'Multi-Status',
	208: 'Already Reported',
	210: 'Content Different',
	226: 'IM Used',
	300: 'Multiple Choices',
	301: 'Moved Permanently',
	302: 'Found',
	303: 'See Other',
	304: 'Not Modified',
	305: 'Use Proxy',
	306: 'Switch Proxy',
	307: 'Temporary Redirect',
	308: 'Permanent Redirect',
	310: 'Too many Redirects',
	400: 'Bad Request',
	401: 'Unauthorized',
	402: 'Payment Required',
	403: 'Forbidden',
	404: 'Not Found',
	405: 'Method Not Allowed',
	406: 'Not Acceptable',
	407: 'Proxy Authentication Required',
	408: 'Request Time-out',
	409: 'Conflict',
	410: 'Gone',
	411: 'Length Required',
	412: 'Precondition Failed',
	413: 'Request Entity Too Large',
	414: 'Request-URI Too Long',
	415: 'Unsupported Media Type',
	416: 'Requested range unsatisfiable',
	417: 'Expectation failed',
	418: 'I’m a teapot',
	420: 'Enhance Your Calm',
	421: 'Bad mapping / Misdirected Request',
	422: 'Unprocessable entity',
	423: 'Locked',
	424: 'Method failure',
	425: 'Too Early',
	426: 'Upgrade Required',
	428: 'Precondition Required',
	429: 'Too Many Requests',
	431: 'Request Header Fields Too Large',
	444: 'No Response',
	449: 'Retry With',
	450: 'Blocked by Windows Parental Controls',
	451: 'Unavailable For Legal Reasons',
	456: 'Unrecoverable Error',
	495: 'SSL Certificate Error',
	496: 'SSL Certificate Required',
	497: 'HTTP Request Sent to HTTPS Port',
	498: 'Token expired/invalid',
	499: 'Client Closed Request',
	500: 'Internal Server Error',
	501: 'Not Implemented',
	502: 'Bad Gateway ou Proxy Error',
	503: 'Service Unavailable',
	504: 'Gateway Time-out',
	505: 'HTTP Version not supported',
	506: 'Variant Also Negotiates',
	507: 'Insufficient storage',
	508: 'Loop detected',
	509: 'Bandwidth Limit Exceeded',
	510: 'Not extended',
	511: 'Network authentication required',
	520: 'Unknown Error',
	521: 'Web Server Is Down',
	522: 'Connection Timed Out',
	523: 'Origin Is Unreachable',
	524: 'A Timeout Occurred',
	525: 'SSL Handshake Failed',
	526: 'Invalid SSL Certificate',
	527: 'Railgun Error',
	529: 'Site is overloaded',
	530: 'Site is Frozen',
	598: 'Network read timeout error',
	599: 'Network connect timeout error'
}

export type HttpCode = keyof typeof httpCode

export default class HttpStatus {

	public static shouldRetry(code: HttpCode): boolean {
		switch (code) {
			case 502:
			case 503:
			case 504: {
				return true
			}

			default: {
				return false
			}
		}
	}

	public static isBodyEmpty(code: HttpCode): boolean {
		switch (code) {
			case 204:
			case 205:
			case 304: {
				return true
			}

			default: {
				return false
			}
		}
	}

	public static isRedirectCode(code: HttpCode): boolean {
		switch (code) {
			case 300:
			case 301:
			case 302:
			case 303:
			case 305:
			case 307:
			case 308: {
				return true
			}

			default: {
				return false
			}
		}
	}

	public static getRawCodes() {
		return httpCode
	}

	public static hasCode(code: number): boolean {
		return !!(Object.keys(this.getRawCodes()) as unknown as Array<number>).includes(code)
	}

	public static getMessage(code: HttpCode): string {
		return this.getRawCodes()[code]
	}

	public static getCode(message: string): number | undefined {
		const code = Object.entries(this.getRawCodes()).find(v => v[1] === message)

		if (!code) return

		return Number(code[0])
	}
}
