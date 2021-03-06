var socket = io.connect('http://localhost:9001');

$(document).ready(function(){		//When the document is ready...
	console.log('Called server.');
	socket.emit('load', true);		//...call data from mongoDB via node web sockets			
});

//When data comes in through the port
socket.on('write', function(data) {
	console.log(data);
	data.sort(sortDate);	//Sort the array by date
	displayEvents(data);	//Call function to display the data
});

function displayEvents(data){
	
	var myHtml = '';
	var currentDate;
	var lastDate = new Date();
	var offsetLeft = 0;
	var offsetTop = 0;

	var screenWidth = window.innerWidth;	

	data.forEach( function(obj) {

		var companyClass;
		if(obj.company == 'O Globo'){
			companyClass = 'globo';
		}else{
			companyClass = 'folha';
		}
		// console.log(obj.image);
		// if(typeof obj.image === 'undefined'){
		// 	console.log('oi');
		// }
		if(obj.image != '' && typeof obj.image !== 'undefined'){
			myHtml += '<img class="articleImage" src="'+ obj.image +'"  style="left: ' + offsetLeft + 'px; top: ' + offsetTop + 'px"><br>';
			offsetLeft += 50;
			if(offsetLeft >= screenWidth){
				offsetLeft = 0;
				offsetTop += 50;
			}
		}
	} );
	
	$('#visualization').html(myHtml);
	// console.log('done');
}

/*---------- AUXILIAR FUNCTIONS ----------*/
//Sort JSON array by date
function sortDate(a, b) {
	//getTime provides an equal value for h,min,s: the current time
    return new Date(a.date).getTime() - new Date(b.date).getTime();
}
