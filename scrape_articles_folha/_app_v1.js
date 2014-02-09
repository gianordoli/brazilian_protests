/*----- MODULES -----*/
//To create the client-server connection
var	connect = require('connect'),
		 fs = require('fs'),
	   util = require('util'),
		 io = require('socket.io').listen(9001), // WS port
	   port = 9000, 							 // HTTP port
	   http = require('http'),
	   	  $ = require('jquery'),				 //jQuery
	   phantom = require('phantom');			 //Phantom JS


/*----- MONGODB -----*/
var databaseUrl = 'news_v1'; // database name, or "username:password@example.com/mydb"
var collections = ['events'];  //collection name
var db = require('mongojs').connect(databaseUrl, collections);


/*----- create web server using connect -----*/
var isLoaded = false;

connect.createServer(connect.static(__dirname + '/public')).listen(port);
util.log('The server is running on port: ' + port);

// init socket.io
io.set('log level', 1);
io.sockets.on('connection', function(socket) {

	socket.on('load', function(isLoaded){
		console.log("Request call: " + isLoaded);
		if(isLoaded){
			loadDB();			
		}
	});
});

function loadDB(){
	console.log('Loading database...');
	db.events.find({'company' : 'Folha de S.Paulo'}, function(err, data) {
		if( err || !data){
			console.log("Nothing found");
		}else{
			console.log('Database loaded.');
			loadPage(data);		
		}
	});	
}

function loadPage(data){

	//var pageUrl = data[0].url;
	// var pageUrl = 'http://www1.folha.uol.com.br/cotidiano/2013/02/1224200-motoboys-bloqueiam-a-paulista-em-protesto-contra-fiscalizacao.shtml';
	// var pageUrl = 'http://www1.folha.uol.com.br/poder/2014/02/1409488-mulher-de-pizzolato-se-irrita-com-jornalistas-ao-tentar-visitar-marido-pela-segunda-vez.shtml';
	// var pageUrl = 'http://www1.folha.uol.com.br/poder/2014/02/1409561-lula-critica-atuacao-de-ministros-do-stf.shtml';
	var pageUrl = data[6].url;
	console.log(pageUrl);

	phantom.create(function(ph) {
	  return ph.createPage(function(page) {

		console.log('Creating Phantom.JS page...');

	    return page.open(pageUrl, function(status) {
	      console.log("opened site? ", status);         
	 
	            page.injectJs('http://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js', function() {
	                //jQuery Loaded.
	                //Wait for a bit for AJAX content to load on the page. Here, we are waiting 2 seconds.
	                setTimeout(function() {
	                    return page.evaluate(function() {
	 
	                        var htmlPage = $('body').html();
	                        return htmlPage

	                    }, function(data) {
	                        scrapePage(data, pageUrl);
	                        ph.exit();
	                    });
	                }, 2000);
	            });
	    });
	    });
	});
}

function scrapePage(pageHtml, pageUrl){

	var article = $('#news', pageHtml);
	var content = $('.content', article);
	
	//Text
	var paragraphs = $('p', content).text();
	console.log(paragraphs);

	//Image
	var imageSource;
	var thumbs = $('.thumbnails', content);

		//Thumbs?
		if(thumbs.length > 0){
			console.log('Thumbs found');
			var imageDiv = $('.image', content);
			var image = $('img', imageDiv);
			imageSource = $(image).attr('src');
		}else{
			console.log('No thumbs found');
			imageSource = $('img', content).attr('src');
		}

		if(imageSource == null){
			console.log('No article image');
		}else{

			db.events.findAndModify({
			    	query: { url: pageUrl },
			    	update: { $set: {
			    					text: paragraphs,
			    					image: imageSource
			    					}
			    			},
			    	new: true
				},
				function(err, doc, lastErrorObject) {
			    	console.log(doc);
			});
		}
}


