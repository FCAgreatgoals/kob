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