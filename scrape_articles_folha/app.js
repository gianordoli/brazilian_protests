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

//1: Load database
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

var docIndex = 20;

//2: Load page
function loadPage(data){

	//var pageUrl = data[0].url;
	// var pageUrl = 'http://www1.folha.uol.com.br/cotidiano/2013/02/1224200-motoboys-bloqueiam-a-paulista-em-protesto-contra-fiscalizacao.shtml';
	// var pageUrl = 'http://www1.folha.uol.com.br/poder/2014/02/1409488-mulher-de-pizzolato-se-irrita-com-jornalistas-ao-tentar-visitar-marido-pela-segunda-vez.shtml';
	// var pageUrl = 'http://www1.folha.uol.com.br/poder/2014/02/1409561-lula-critica-atuacao-de-ministros-do-stf.shtml';
	var pageUrl = 'http://www1.folha.uol.com.br/ilustrada/1253944-hollywood-vive-crise-no-setor-de-efeitos-especiais-produtora-que-levou-o-oscar-faliu.shtml';
	//var pageUrl = data[docIndex].url;
	console.log(pageUrl);

	phantom.create(function(ph) {
		return ph.createPage(function(page) {

			console.log('Creating Phantom.JS page...');

	    	return page.open(pageUrl, function(status) {
	    		console.log("opened site? ", status);         
	 
	            //Wait for a bit for AJAX content to load on the page. Here, we are waiting 1 seconds.
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
}

//3: Scrape page
function scrapePage(pageHtml, pageUrl){

	var article = $('#news', pageHtml);
	var content = $('.content', article);

	//Another template template (colunistas, ilustrada...)
	if(article.length <= 0){
		console.log('Different template');
		content = $('#articleNew', pageHtml);
	}
	
	var test;
	$(content).each(function() {
  		test += $(this).html();
	});
	console.log(test);
	io.sockets.emit('write', test);
	
	//Text
	var paragraphs = $('p', content).text();
	// console.log(paragraphs);

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
			var pageImages = $('img', content);
			// console.log(pageImages.length);

			// Checking the fyle type — prevents from storing thumbs
			for(var i = 0; i < pageImages.length; i++){
				imageSource = $(pageImages[i], content).attr('src');
				var imageType = imageSource.substr(imageSource.lastIndexOf('.') + 1, imageSource.length);
				// console.log(imageType);
				if(imageType != 'jpeg'){
					imageSource = '';
				}else{
					break;
				}
			}
			// console.log(imageSource);
		}

		if(imageSource == null){
			console.log('No article image');
			imageSource = '';
		}
		//updateDoc(pageUrl, paragraphs, imageSource);
}

//4: Update doc
function updateDoc(pageUrl, paragraphs, imageSource){
	console.log(imageSource);
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
			if(err){
				console.log('Error');
			}else{
		    	console.log(doc);
		    	console.log('------------------------------');				
			}
	});
}


