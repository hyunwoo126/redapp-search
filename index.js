const http = require('http');

const port = process.env.PORT || 5000;


const express = require('express');
var app = express();
app.get('/', function(request, response) {
    response.send('hey');
  });