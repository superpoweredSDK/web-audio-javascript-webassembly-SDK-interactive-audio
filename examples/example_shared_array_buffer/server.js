var express = require('express')
var serveStatic = require('serve-static')
const port = 8000;
var app = express()


// Set header to force download
function setHeaders (res, path) {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp')
}



app.use(serveStatic('.', { index: ['index.html', 'default.htm'], setHeaders: setHeaders }))
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`)
})

