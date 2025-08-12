# Kob

A lightweight and modern HTTP library for Node.js, inspired by Koa.js design patterns with middleware composition and context-based request/response handling.

## Features

- 🚀 **Lightweight**: Minimal core with extensible middleware system
- 🔧 **Modern**: Built with TypeScript and modern Node.js features
- 🎯 **Context-based**: Clean request/response handling through context objects
- 🧩 **Middleware**: Composable middleware with async/await support
- 📁 **File uploads**: Built-in multipart form data and file handling
- 🔒 **Proxy support**: Advanced proxy and IP handling capabilities

## Installation

```bash
npm install @fca.gg/kob
```

## Quick Start

```typescript
import Kob from '@fca.gg/kob'

const app = new Kob()

// Simple middleware
app.use(async (ctx, next) => {
  console.log(`${ctx.getRequest().getMethod()} ${ctx.getRequest().getUrl()}`)
  await next()
})

// Route handler
app.use(async (ctx, next) => {
  if (ctx.getRequest().getPath() === '/hello') {
    ctx.getResponse().setBody('Hello World!')
    return
  }
  await next()
})

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000')
})
```

## API Reference

### Application

#### `new Kob(options?)`

Create a new Kob application instance.

**Options:**
- `proxy`: boolean - Trust proxy headers (default: false)
- `subdomainOffset`: number - Subdomain offset for parsing (default: 2)
- `proxyIpHeader`: string - Header name for proxy IP (default: 'X-Forwarded-For')
- `maxIpsCount`: number - Maximum IPs to parse from proxy header (default: 0)
- `silent`: boolean - Silent error logging (default: false)

```typescript
const app = new Kob({
  proxy: true,
  silent: false
})
```

#### `app.use(middleware)`

Add middleware to the application.

```typescript
app.use(async (ctx, next) => {
  // Middleware logic
  await next()
})
```

#### `app.listen(port, callback?)`

Start the HTTP server.

```typescript
app.listen(3000, () => {
  console.log('Server started on port 3000')
})
```

### Context

The context object (`ctx`) encapsulates the request and response objects and provides convenience methods.

#### Request Methods

- `ctx.getRequest().getMethod()` - HTTP method
- `ctx.getRequest().getUrl()` - Full URL
- `ctx.getRequest().getPath()` - URL pathname
- `ctx.getRequest().getQuery()` - Query parameters
- `ctx.getRequest().getHeaders()` - Request headers
- `ctx.getRequest().getBody()` - Request body (after parsing)

#### Response Methods

- `ctx.getResponse().setStatus(code)` - Set status code
- `ctx.getResponse().setBody(body)` - Set response body
- `ctx.getResponse().setHeader(name, value)` - Set response header
- `ctx.getResponse().redirect(url)` - Redirect response

## Examples

### JSON API

```typescript
import Kob from '@fca.gg/kob'

const app = new Kob()

// JSON middleware
app.use(async (ctx, next) => {
  try {
    await next()
  } catch (err) {
    ctx.getResponse().setStatus(500).setBody({ error: 'Internal Server Error' })
  }
})

// API route
app.use(async (ctx, next) => {
  if (ctx.getRequest().getPath() === '/api/users') {
    ctx.getResponse().setBody({
      users: [
        { id: 1, name: 'John Doe' },
        { id: 2, name: 'Jane Smith' }
      ]
    })
    return
  }
  await next()
})

app.listen(3000)
```

### File Upload

```typescript
app.use(async (ctx, next) => {
  if (ctx.getRequest().getPath() === '/upload') {
    const body = await ctx.getRequest().getBody()
    
    if (body && typeof body === 'object' && 'file' in body) {
      const file = body.file
      if (file.type === 'file') {
        console.log(`Uploaded: ${file.filename} (${file.size} bytes)`)
        ctx.getResponse().setBody({ message: 'File uploaded successfully' })
        return
      }
    }
  }
  await next()
})
```

### Error Handling

```typescript
app.use(async (ctx, next) => {
  try {
    await next()
  } catch (err) {
    ctx.getResponse().setStatus(err.status || 500)
    ctx.getResponse().setBody({
      error: err.message || 'Internal Server Error'
    })
  }
})
```

### Custom Headers and CORS

```typescript
app.use(async (ctx, next) => {
  ctx.getResponse()
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  await next()
})
```

## HTTP Methods

Kob supports all standard HTTP methods:

- GET
- POST
- PUT
- DELETE
- PATCH
- HEAD
- OPTIONS
- TRACE
- CONNECT

## License

This project is licensed under the AGPL v3 License - see the [LICENSE](LICENSE) file for details.

> We chose the AGPL to ensure that Kob remains truly open source and contributive.
If you use or adapt Kob, even over a network, you must share your modifications. That's the spirit of the project — building useful tools together, in the open.
