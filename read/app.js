/*----- MODULES -----*/
//To create the client-server connection
var	connect = require('connect'),
		 fs = require('fs'),
	   util = require('util'),
		 io = require('socket.io').listen(9001), // WS port
	   port = 9000, 							 // HTTP port

	   	  $ = require('jquery');				 //jQuery


/*----- MONGODB -----*/
var databaseUrl = 'news_v1'; // database name, or "username:password@example.com/mydb"
var collections = ['events'];  //collection name
var db = require('mongojs').connect(databaseUrl, collections);


/*----- create web server using connect -----*/
connect.createServer(
	connect.static(__dirname + '/public') // two underscores
).listen(port);
util.log('the server is running on port: ' + port);

// init socket.io
io.set('log level', 1);

//This part listens to the data coming from the browser and send it to the Arduino
io.sockets.on('connection', function(socket) {

	//util.log is the same as console.log, but it prints the date and time along with the msg
	// util.log('Ooooooh, someone just poked me :)');
	socket.on('load', function(isLoaded){
		console.log("Request call: " + isLoaded);
		if(isLoaded){

			db.events.find(function(err, data) {
				if( err || !data){
					console.log("Nothing found");
				}else{
					//Sending to browser
					io.sockets.emit('write', data);
				}
			});
		}
	});
});