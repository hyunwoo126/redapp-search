const express = require('express');
const bodyParser = require('body-parser');
//myModules
//const appStores = require('./myModules/appstores');


var app = express();
app.set('port', (process.env.PORT || 5000));
app.listen(app.get('port'), function() {
    console.log('Node app is running on port', app.get('port'));
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
})); 
app.use(express.static(__dirname + '/public/dist'));
// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/', function(request, response) {
    response.render('index');
});

app.get('/search', function(request, response) {
    response.send('YES! GET /search');
});
app.post('/search', function(req, res){
    console.log(req.body);
	if(req.body.store && req.body.appName && typeof appStores[req.body.store] == 'function'){
		appStores[req.body.store](req.body.appName, res);
	} else {
		res.send([]);
	}
});