const http = require('http');

const port = process.env.PORT || 5000;


const express = require('express');
var app = express();
app.set('port', (process.env.PORT || 5000));
app.get('/', function(request, response) {
    response.send('hey');
});

app.listen(app.get('port'), function() {
    console.log('Node app is running on port', app.get('port'));
  });