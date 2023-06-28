import Kob from './Kob';

const app = new Kob();

app.use(async ctx => {
	console.log(ctx.getRequest().getUrl())

	ctx.getResponse().redirect('https://discord.fr')
})

app.listen(8080)