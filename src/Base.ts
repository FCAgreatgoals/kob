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

import Context from './Context'
import Kob from './Kob'

export default class Base {

	private readonly context: Context

	constructor(context: Context) {
		this.context = context
	}

	protected getContext(): Context {
		return this.context
	}

	public getKob(): Kob {
		return this.context.getKob()
	}

}